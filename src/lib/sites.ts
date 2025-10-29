import { promises as fs } from "fs";
import path from "path";
import { promisify } from "util";
import { exec } from "child_process";
import { prisma } from "./prisma";
import { env, MAX_ARCHIVE_BYTES } from "./env";
import { randomSlug, slugify } from "./slug";
import { DomainStatus, DomainType, type Site, type SiteDomain } from "@prisma/client";
import { ensureSandboxDnsRecord } from "./cloudflare";

const execAsync = promisify(exec);

export const DEFAULT_SECURITY_CONFIG = {
  forceHttps: true,
  autoIndexing: true,
  accessLogging: true,
  basicAuth: false,
  firewall: {
    enabled: true,
    geoBlock: [] as string[],
  },
};

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends Array<infer U>
    ? Array<DeepPartial<U>>
    : T[K] extends object
      ? DeepPartial<T[K]>
      : T[K];
};

export type CreateSiteInput = {
  name: string;
  customDomain?: string;
  requestDomainPurchase?: boolean;
};

export type UpdateSecurityInput = DeepPartial<typeof DEFAULT_SECURITY_CONFIG>;

function mergeSecurityConfig(partial: UpdateSecurityInput) {
  return {
    ...DEFAULT_SECURITY_CONFIG,
    ...partial,
    firewall: {
      ...DEFAULT_SECURITY_CONFIG.firewall,
      ...partial.firewall,
    },
  };
}

export async function listSitesForUser(userId: string) {
  return prisma.site.findMany({
    where: { userId },
    include: { domains: true, deployments: true, purchaseRequests: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getSiteForUser(siteId: string, userId: string) {
  return prisma.site.findFirst({
    where: { id: siteId, userId },
    include: { domains: true, deployments: true, purchaseRequests: true },
  });
}

export async function createSiteForUser(userId: string, input: CreateSiteInput) {
  const trimmedName = input.name.trim();
  if (!trimmedName) {
    throw new Error("Site name is required.");
  }

  const normalizedCustomDomain = input.customDomain?.trim().toLowerCase();
  if (normalizedCustomDomain && normalizedCustomDomain.endsWith(env.PLATFORM_FREE_DOMAIN)) {
    throw new Error(`Custom domains cannot use the reserved ${env.PLATFORM_FREE_DOMAIN} sandbox namespace.`);
  }

  const baseSlug = slugify(trimmedName);
  let slug = baseSlug;
  let suffix = 1;
  while (await prisma.site.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  const storagePath = path.join(env.PLATFORM_UPLOAD_ROOT, slug);
  await fs.mkdir(storagePath, { recursive: true });

  const freeSubdomain = `${randomSlug(8)}.${env.PLATFORM_FREE_DOMAIN}`;

  const site = await prisma.site.create({
    data: {
      userId,
      name: trimmedName,
      slug,
      storagePath,
      maxUploadSize: MAX_ARCHIVE_BYTES,
      securityConfig: mergeSecurityConfig({}),
      domains: {
        create: [
          {
            hostname: freeSubdomain,
            isPrimary: true,
            verificationStatus: DomainStatus.VERIFIED,
            type: DomainType.FREE_SUBDOMAIN,
          },
          ...(normalizedCustomDomain
            ? [
                {
                  hostname: normalizedCustomDomain,
                  isPrimary: false,
                  verificationStatus: DomainStatus.PENDING,
                  type: DomainType.CUSTOM,
                },
              ]
            : []),
        ],
      },
      purchaseRequests: input.requestDomainPurchase
        ? {
            create: {
              domain: normalizedCustomDomain ?? `${slug}`,
              tlds: [".com", ".ai", ".org"],
              notes: "Auto-generated purchase request. Update with user preferences from dashboard.",
            },
          }
        : undefined,
    },
    include: { domains: true },
  });

  try {
    await ensureSandboxDnsRecord(freeSubdomain);
  } catch (error) {
    await prisma.site.delete({ where: { id: site.id } });
    await fs.rm(storagePath, { recursive: true, force: true }).catch(() => undefined);
    throw new Error(`Failed to create sandbox DNS record: ${(error as Error).message}`);
  }

  await refreshNginxForSite(site);
  return site;
}

export async function updatePrimaryDomain(site: Site & { domains: SiteDomain[] }, hostname: string) {
  const normalized = hostname.trim().toLowerCase();
  if (!normalized) {
    throw new Error("Domain cannot be empty");
  }

  const sandboxDomain = site.domains.find((d) => d.type === DomainType.FREE_SUBDOMAIN)?.hostname;
  if (normalized.endsWith(env.PLATFORM_FREE_DOMAIN) && normalized !== sandboxDomain) {
    throw new Error("Sandbox subdomains are managed automatically and cannot be reassigned manually.");
  }

  if (normalized.endsWith(env.PLATFORM_FREE_DOMAIN) && normalized === sandboxDomain) {
    // nothing to change if it's already primary
    if (site.domains.find((d) => d.hostname === normalized)?.isPrimary) {
      return site;
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.siteDomain.updateMany({
      where: { siteId: site.id },
      data: { isPrimary: false },
    });
    const existing = site.domains.find((d) => d.hostname === normalized);
    if (existing) {
      await tx.siteDomain.update({
        where: { id: existing.id },
        data: { isPrimary: true },
      });
    } else {
      await tx.siteDomain.create({
        data: {
          siteId: site.id,
          hostname: normalized,
          isPrimary: true,
          verificationStatus: DomainStatus.PENDING,
          type: DomainType.CUSTOM,
        },
      });
    }
  });

  const freshSite = await prisma.site.findUnique({
    where: { id: site.id },
    include: { domains: true },
  });

  if (!freshSite) return null;
  await refreshNginxForSite(freshSite);
  return freshSite;
}

export async function updateSecurityConfig(siteId: string, userId: string, payload: UpdateSecurityInput) {
  const site = await prisma.site.update({
    where: { id: siteId, userId },
    data: {
      securityConfig: mergeSecurityConfig(payload),
    },
    include: { domains: true },
  });

  await refreshNginxForSite(site);
  return site;
}

export function buildNginxServerBlock(hostname: string, rootPath: string) {
  const serverNames = hostname.includes(".") && !hostname.endsWith(env.PLATFORM_FREE_DOMAIN)
    ? `${hostname} www.${hostname}`
    : hostname;

  return `server {
    listen 80;
    listen [::]:80;
    server_name ${serverNames};

    root ${rootPath};
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(?:css|js|json|txt|xml|ico|png|jpg|jpeg|gif|webp|svg|woff2?)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
`;
}

export async function refreshNginxForSite(site: Site & { domains: SiteDomain[] }) {
  const snippetDir = env.PLATFORM_NGINX_SNIPPETS;
  await fs.mkdir(snippetDir, { recursive: true });

  const writes = site.domains.map(async (domain) => {
    const normalized = domain.hostname.toLowerCase();
    const safeName = normalized.replace(/[^a-z0-9.-]/g, "_");
    const snippetPath = path.join(snippetDir, `${safeName}.conf`);
    const config = buildNginxServerBlock(normalized, site.storagePath);
    await fs.writeFile(snippetPath, config, "utf8");
  });

  await Promise.all(writes);

  try {
    await execAsync("sudo systemctl reload nginx");
  } catch (error) {
    console.error("Failed to reload nginx", error);
    throw new Error("Site deployed but failed to reload nginx. Please reload manually.");
  }
}
