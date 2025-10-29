import { promises as fs } from "fs";
import path from "path";
import { promisify } from "util";
import { exec } from "child_process";
import { prisma } from "./prisma";
import { env, MAX_ARCHIVE_BYTES } from "./env";
import { randomSlug, slugify } from "./slug";
import { Prisma, DomainStatus, DomainType, SiteStatus, type Site, type SiteDomain } from "@prisma/client";
import { ensureSandboxDnsRecord, deleteSandboxDnsRecord } from "./cloudflare";
import { ensureSandboxCertificate } from "./certs";

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

  if (normalizedCustomDomain) {
    const conflict = await prisma.siteDomain.findUnique({
      where: { hostname: normalizedCustomDomain },
    });
    if (conflict) {
      throw new Error("This domain is already linked to another site on the platform.");
    }
  }

  const domainsToCreate: Prisma.SiteDomainCreateWithoutSiteInput[] = [
    {
      hostname: freeSubdomain,
      isPrimary: normalizedCustomDomain ? false : true,
      verificationStatus: DomainStatus.VERIFIED,
      type: DomainType.FREE_SUBDOMAIN,
    },
  ];

  if (normalizedCustomDomain) {
    domainsToCreate.push({
      hostname: normalizedCustomDomain,
      isPrimary: true,
      verificationStatus: DomainStatus.PENDING,
      type: DomainType.CUSTOM,
    });
  }

  let site: Site & { domains: SiteDomain[] };
  try {
    site = await prisma.site.create({
      data: {
        userId,
        name: trimmedName,
        slug,
        storagePath,
        maxUploadSize: MAX_ARCHIVE_BYTES,
        securityConfig: mergeSecurityConfig({}),
        domains: {
          create: domainsToCreate,
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
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new Error("Domain is already linked to another site.");
    }
    throw error;
  }

  try {
    await ensureSandboxDnsRecord(freeSubdomain);
    await ensureSandboxCertificate();
    await refreshNginxForSite(site);
  } catch (error) {
    await prisma.site.delete({ where: { id: site.id } }).catch(() => undefined);
    await fs.rm(storagePath, { recursive: true, force: true }).catch(() => undefined);
    await deleteSandboxDnsRecord(freeSubdomain).catch(() => undefined);
    throw new Error((error as Error).message);
  }

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
      return;
    }

    const conflict = await tx.siteDomain.findUnique({
      where: { hostname: normalized },
      select: { siteId: true },
    });

    if (conflict && conflict.siteId !== site.id) {
      throw new Error("This domain is already linked to another site.");
    }

    await tx.siteDomain.create({
      data: {
        siteId: site.id,
        hostname: normalized,
        isPrimary: true,
        verificationStatus: DomainStatus.PENDING,
        type: DomainType.CUSTOM,
      },
    });
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
  const site = await prisma.site.findFirst({
    where: { id: siteId, userId },
    include: { domains: true },
  });

  if (!site) {
    throw new Error("Site not found");
  }

  const updated = await prisma.site.update({
    where: { id: site.id },
    data: {
      securityConfig: mergeSecurityConfig(payload),
    },
    include: { domains: true },
  });

  await refreshNginxForSite(updated);
  return updated;
}

export async function pauseSiteForUser(siteId: string, userId: string) {
  const site = await prisma.site.findFirst({
    where: { id: siteId, userId },
    include: { domains: true },
  });

  if (!site) {
    throw new Error("Site not found");
  }

  if (site.status === SiteStatus.DISABLED) {
    await refreshNginxForSite(site);
    return site;
  }

  const updated = await prisma.site.update({
    where: { id: site.id },
    data: { status: SiteStatus.DISABLED },
    include: { domains: true },
  });

  await refreshNginxForSite(updated);
  return updated;
}

export async function resumeSiteForUser(siteId: string, userId: string) {
  const site = await prisma.site.findFirst({
    where: { id: siteId, userId },
    include: { domains: true, deployments: { orderBy: { createdAt: "desc" }, take: 1 } },
  });

  if (!site) {
    throw new Error("Site not found");
  }

  if (site.deployments.length === 0) {
    throw new Error("Deploy a build before resuming the site.");
  }

  if (site.status === SiteStatus.ACTIVE) {
    await refreshNginxForSite(site);
    return site;
  }

  const updated = await prisma.site.update({
    where: { id: site.id },
    data: { status: SiteStatus.ACTIVE },
    include: { domains: true },
  });

  await refreshNginxForSite(updated);
  return updated;
}

export async function deleteSiteForUser(siteId: string, userId: string) {
  const site = await prisma.site.findFirst({
    where: { id: siteId, userId },
    include: { domains: true },
  });

  if (!site) {
    throw new Error("Site not found");
  }

  const sandboxHosts = site.domains
    .filter((domain) => domain.type === DomainType.FREE_SUBDOMAIN)
    .map((domain) => domain.hostname.toLowerCase());

  await prisma.site.delete({ where: { id: siteId } });

  await Promise.all(
    site.domains.map(async (domain) => {
      const snippetPath = snippetPathForHost(domain.hostname.toLowerCase());
      await fs.rm(snippetPath, { force: true }).catch(() => undefined);
    }),
  );

  await fs.rm(site.storagePath, { recursive: true, force: true }).catch(() => undefined);

  await Promise.all(sandboxHosts.map((host) => deleteSandboxDnsRecord(host).catch(() => undefined)));

  try {
    await execAsync("sudo systemctl reload nginx");
  } catch (error) {
    console.error("Failed to reload nginx after deletion", error);
  }
}

type NginxTlsConfig = {
  certPath: string;
  keyPath: string;
  fullchainPath: string;
};

function buildNginxServerBlock(
  hostname: string,
  rootPath: string,
  status: SiteStatus,
  options?: { tls?: NginxTlsConfig },
) {
  const serverNames = hostname.includes(".") && !hostname.endsWith(env.PLATFORM_FREE_DOMAIN)
    ? `${hostname} www.${hostname}`
    : hostname;

  const maintenanceBlock = `server {
    listen 80;
    listen [::]:80;
    server_name ${serverNames};

    return 503;
    add_header Retry-After 300;
}`;

  const httpBlock = `server {
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
}`;

  if (status === SiteStatus.DISABLED) {
    if (options?.tls) {
      return `${maintenanceBlock}

server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name ${serverNames};
    ssl_certificate ${options.tls.fullchainPath};
    ssl_certificate_key ${options.tls.keyPath};

    return 503;
    add_header Retry-After 300;
}`;
    }
    return `${maintenanceBlock}\n`;
  }

  if (!options?.tls) {
    return `${httpBlock}\n`;
  }

  const httpsBlock = `server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name ${serverNames};

    ssl_certificate ${options.tls.fullchainPath};
    ssl_certificate_key ${options.tls.keyPath};
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;

    root ${rootPath};
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(?:css|js|json|txt|xml|ico|png|jpg|jpeg|gif|webp|svg|woff2?)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}`;

  const redirectBlock = `server {
    listen 80;
    listen [::]:80;
    server_name ${serverNames};

    return 301 https://$host$request_uri;
}`;

  return `${redirectBlock}

${httpsBlock}
`;
}

function snippetPathForHost(hostname: string) {
  const safeName = hostname.toLowerCase().replace(/[^a-z0-9.-]/g, "_");
  return path.join(env.PLATFORM_NGINX_SNIPPETS, `${safeName}.conf`);
}

export async function refreshNginxForSite(site: Site & { domains: SiteDomain[] }) {
  const snippetDir = env.PLATFORM_NGINX_SNIPPETS;
  await fs.mkdir(snippetDir, { recursive: true });

  let sandboxTls: NginxTlsConfig | null = null;
  if (site.domains.some((domain) => domain.type === DomainType.FREE_SUBDOMAIN)) {
    const cert = await ensureSandboxCertificate();
    sandboxTls = {
      certPath: cert.certPath,
      keyPath: cert.keyPath,
      fullchainPath: cert.fullchainPath,
    };
  }

  const writes = site.domains.map(async (domain) => {
    const normalized = domain.hostname.toLowerCase();
    const snippetPath = snippetPathForHost(normalized);
    const isSandbox = domain.type === DomainType.FREE_SUBDOMAIN;
    const config = buildNginxServerBlock(normalized, site.storagePath, site.status, {
      tls: isSandbox ? sandboxTls ?? undefined : undefined,
    });
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
