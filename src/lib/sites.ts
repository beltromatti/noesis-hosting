import { promises as fs } from "fs";
import path from "path";
import { promisify } from "util";
import { exec } from "child_process";
import { prisma } from "./prisma";
import {
  env,
  MAX_ARCHIVE_BYTES,
  DEFAULT_CPU_PERCENT,
  DEFAULT_MEMORY_LIMIT_MB,
  DEFAULT_PROCESS_LIMIT,
  PHP_FPM_POOL_DIR,
  PHP_FPM_SERVICE,
  PHP_FPM_SOCKET_ROOT,
} from "./env";
import { randomSlug, slugify } from "./slug";
import {
  Prisma,
  DomainStatus,
  DomainType,
  SecurityScanStatus,
  SiteRuntime,
  SiteStatus,
  UsageEventType,
  type Site,
  type SiteDomain,
} from "@prisma/client";
import { ensureSandboxDnsRecord, deleteSandboxDnsRecord } from "./cloudflare";
import { ensureSandboxCertificate } from "./certs";
import { recordUsageEvent } from "./usage";
import { noteDomainInsight, noteSiteCreated, noteSiteDeleted, noteSiteStatusChange } from "./analytics";

const execAsync = promisify(exec);

const SITE_ENTRYPOINTS = ["index.php", "index.html", "index.htm"] as const;
const JS_EXTENSIONS = [".js", ".mjs", ".cjs", ".jsx", ".ts", ".tsx"];
const JS_BUNDLE_THRESHOLD_BYTES = 70 * 1024;
const SPA_HINT_DIRECTORIES = ["assets", "static", "build", "dist", "js", "scripts"];
const SPA_HINT_FILES = ["manifest.json", "service-worker.js", "sw.js", "workbox-", "vite.svg"];

const RUNTIME_PRESETS: Record<SiteRuntime, { cpu: number; memory: number; storage: number; process: number; isolated: boolean }> = {
  [SiteRuntime.STATIC]: {
    cpu: Math.max(5, Math.floor(Number(DEFAULT_CPU_PERCENT) / 2)),
    memory: Math.max(128, Number(DEFAULT_MEMORY_LIMIT_MB) - 64),
    storage: env.MAX_ARCHIVE_SIZE_MB,
    process: 0,
    isolated: true,
  },
  [SiteRuntime.SPA]: {
    cpu: Math.max(10, Math.floor((Number(DEFAULT_CPU_PERCENT) * 2) / 3)),
    memory: Math.max(160, Number(DEFAULT_MEMORY_LIMIT_MB) - 32),
    storage: env.MAX_ARCHIVE_SIZE_MB,
    process: 0,
    isolated: true,
  },
  [SiteRuntime.PHP]: {
    cpu: Number(DEFAULT_CPU_PERCENT),
    memory: Number(DEFAULT_MEMORY_LIMIT_MB),
    storage: env.MAX_ARCHIVE_SIZE_MB,
    process: Math.max(4, Number(DEFAULT_PROCESS_LIMIT)),
    isolated: true,
  },
};

type SiteWithRelations = Site & {
  domains: SiteDomain[];
  securityProfile?: {
    runtime: SiteRuntime;
    cpuLimitPercent: number;
    memoryLimitMb: number;
    storageLimitMb: number;
    processLimit: number;
    isolated: boolean;
    lastScanAt: Date | null;
    lastScanStatus: SecurityScanStatus;
    lastScanNotes: string | null;
    phpOpenBaseDir: string | null;
    phpDisabledFuncs: string[];
  } | null;
};

function phpPoolFilename(slug: string) {
  return `${slug.replace(/[^a-z0-9_-]/gi, "_")}.conf`;
}

function phpSocketFilename(slug: string) {
  return `${slug.replace(/[^a-z0-9_-]/gi, "_")}.sock`;
}

function phpPoolPath(slug: string) {
  return path.join(PHP_FPM_POOL_DIR, phpPoolFilename(slug));
}

function phpSocketPath(slug: string) {
  return path.join(PHP_FPM_SOCKET_ROOT, phpSocketFilename(slug));
}

async function ensureRuntimeDirectories() {
  await fs.mkdir(PHP_FPM_POOL_DIR, { recursive: true }).catch(() => undefined);
  await fs.mkdir(PHP_FPM_SOCKET_ROOT, { recursive: true }).catch(() => undefined);
  try {
    await execAsync(`sudo chown www-data:www-data ${PHP_FPM_SOCKET_ROOT}`);
    await execAsync(`sudo chmod 0770 ${PHP_FPM_SOCKET_ROOT}`);
  } catch (error) {
    console.warn("Unable to adjust permissions for PHP socket directory", error);
  }
}

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

type DeploymentAnalysis = {
  totalBytes: number;
  entryPoint: string | null;
  phpDetected: boolean;
  totalJsBytes: number;
  largeJsFiles: number;
  hasServiceWorker: boolean;
  hasManifest: boolean;
  spaHintCount: number;
};

export async function analyzeDeploymentTree(root: string): Promise<DeploymentAnalysis> {
  const stack: string[] = [root];
  let totalBytes = 0;
  let entryPoint: string | null = null;
  let phpDetected = false;
  let totalJsBytes = 0;
  let largeJsFiles = 0;
  let hasServiceWorker = false;
  let hasManifest = false;
  let spaHintCount = 0;

  while (stack.length > 0) {
    const current = stack.pop()!;
    const dir = await fs.opendir(current);
    for await (const dirent of dir) {
      const absolute = path.join(current, dirent.name);
      const relative = path.relative(root, absolute).replace(/\\/g, "/");

      if (relative.startsWith("..")) {
        throw new Error("Archive attempted to write outside its sandbox.");
      }

      const stats = await fs.lstat(absolute);
      if (stats.isSymbolicLink()) {
        throw new Error(`Symbolic links are not permitted in deployments (${relative}).`);
      }

      if (stats.isDirectory()) {
        stack.push(absolute);
        const topLevel = relative.split("/")[0]?.toLowerCase();
        if (topLevel && SPA_HINT_DIRECTORIES.includes(topLevel)) {
          spaHintCount += 1;
        }
        continue;
      }

      if (!stats.isFile()) {
        throw new Error(`Unsupported file type detected (${relative}).`);
      }

      totalBytes += stats.size;

      const lowerRel = relative.toLowerCase();
      if (SITE_ENTRYPOINTS.includes(lowerRel as (typeof SITE_ENTRYPOINTS)[number])) {
        if (entryPoint === null) {
          entryPoint = lowerRel;
        } else if (entryPoint !== "index.php" && lowerRel === "index.php") {
          // prefer PHP entry point if both supplied
          entryPoint = "index.php";
        }
      }

      if (lowerRel.endsWith(".php")) {
        phpDetected = true;
      }

      if (JS_EXTENSIONS.some((ext) => lowerRel.endsWith(ext))) {
        totalJsBytes += stats.size;
        if (stats.size >= JS_BUNDLE_THRESHOLD_BYTES) {
          largeJsFiles += 1;
        }
      }

      if (!hasManifest && SPA_HINT_FILES.some((hint) => lowerRel.includes(hint))) {
        if (lowerRel.includes("manifest")) {
          hasManifest = true;
        }
        if (lowerRel.includes("service-worker") || lowerRel.includes("sw.js") || lowerRel.includes("workbox")) {
          hasServiceWorker = true;
        }
      }
    }
  }

  return {
    totalBytes,
    entryPoint,
    phpDetected,
    totalJsBytes,
    largeJsFiles,
    hasServiceWorker,
    hasManifest,
    spaHintCount,
  };
}

export function determineRuntimeFromAnalysis(analysis: DeploymentAnalysis): SiteRuntime {
  if (analysis.entryPoint === "index.php") {
    return SiteRuntime.PHP;
  }

  const isHtml = analysis.entryPoint === "index.html" || analysis.entryPoint === "index.htm";
  if (!isHtml) {
    return SiteRuntime.STATIC;
  }

  const spaSignals =
    analysis.largeJsFiles > 0 ||
    analysis.totalJsBytes >= 300 * 1024 ||
    analysis.hasServiceWorker ||
    analysis.hasManifest ||
    analysis.spaHintCount >= 2;

  return spaSignals ? SiteRuntime.SPA : SiteRuntime.STATIC;
}

function runtimePreset(runtime: SiteRuntime) {
  return RUNTIME_PRESETS[runtime] ?? RUNTIME_PRESETS[SiteRuntime.STATIC];
}

export function getRuntimePreset(runtime: SiteRuntime) {
  return runtimePreset(runtime);
}

export async function listSitesForUser(userId: string) {
  return prisma.site.findMany({
    where: { userId },
    include: { domains: true, deployments: true, purchaseRequests: true, securityProfile: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getSiteForUser(siteId: string, userId: string) {
  return prisma.site.findFirst({
    where: { id: siteId, userId },
    include: { domains: true, deployments: true, purchaseRequests: true, securityProfile: true },
  });
}

export async function createSiteForUser(userId: string, input: CreateSiteInput) {
  const trimmedName = input.name.trim();
  if (!trimmedName) {
    throw new Error("Site name is required.");
  }

  const existingWithName = await prisma.site.findFirst({
    where: {
      userId,
      name: {
        equals: trimmedName,
        mode: "insensitive",
      },
    },
    select: { id: true },
  });
  if (existingWithName) {
    throw new Error("You already have a site with this name. Choose a different label to keep things organized.");
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

  const defaultPreset = runtimePreset(SiteRuntime.STATIC);

  let site: SiteWithRelations;
  try {
    site = await prisma.site.create({
      data: {
        userId,
        name: trimmedName,
        slug,
        runtime: SiteRuntime.STATIC,
        storagePath,
        maxUploadSize: MAX_ARCHIVE_BYTES,
        securityConfig: mergeSecurityConfig({}),
        domains: {
          create: domainsToCreate,
        },
        securityProfile: {
          create: {
            runtime: SiteRuntime.STATIC,
            cpuLimitPercent: defaultPreset.cpu,
            memoryLimitMb: defaultPreset.memory,
            storageLimitMb: defaultPreset.storage,
            processLimit: defaultPreset.process,
            phpOpenBaseDir: storagePath,
            phpDisabledFuncs: [
              "exec",
              "shell_exec",
              "passthru",
              "system",
              "proc_open",
              "popen",
              "pcntl_exec",
            ],
          },
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
      include: { domains: true, securityProfile: true },
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
    await noteSiteCreated({
      siteId: site.id,
      userId,
      status: site.status,
      runtime: site.runtime,
      domains: site.domains.map((domain) => ({
        type: domain.type,
        isPrimary: domain.isPrimary,
        verificationStatus: domain.verificationStatus,
      })),
    });
    void recordUsageEvent({
      eventType: UsageEventType.SITE_CREATED,
      userId: userId,
      siteId: site.id,
      metadata: { name: site.name },
    });
  } catch (error) {
    await prisma.site.delete({ where: { id: site.id } }).catch(() => undefined);
    await fs.rm(storagePath, { recursive: true, force: true }).catch(() => undefined);
    await deleteSandboxDnsRecord(freeSubdomain).catch(() => undefined);
    throw new Error((error as Error).message);
  }

  return site;
}

export async function updatePrimaryDomain(site: SiteWithRelations, hostname: string) {
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
    include: { domains: true, securityProfile: true },
  });

  if (!freshSite) return null;
  const primaryDomain = freshSite.domains.find((domain) => domain.isPrimary) ?? freshSite.domains[0];
  if (primaryDomain) {
    await noteDomainInsight({
      siteId: site.id,
      dnsVerified:
        primaryDomain.type === DomainType.FREE_SUBDOMAIN ||
        primaryDomain.verificationStatus === DomainStatus.VERIFIED,
      proxied: false,
    });
  }
  void recordUsageEvent({
    eventType: UsageEventType.DOMAIN_UPDATED,
    siteId: site.id,
    userId: site.userId,
    metadata: { hostname: normalized },
  });
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
    include: { domains: true, securityProfile: true },
  });

  await refreshNginxForSite(updated);
  void recordUsageEvent({
    eventType: UsageEventType.SECURITY_UPDATED,
    siteId: site.id,
    userId: site.userId,
    metadata: payload as Prisma.InputJsonValue,
  });
  return updated;
}

export async function pauseSiteForUser(siteId: string, userId: string) {
  const site = await prisma.site.findFirst({
    where: { id: siteId, userId },
    include: { domains: true, securityProfile: true },
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
    include: { domains: true, securityProfile: true },
  });

  await refreshNginxForSite(updated);
  await noteSiteStatusChange({
    siteId: site.id,
    userId: site.userId,
    nextStatus: SiteStatus.DISABLED,
  });
  void recordUsageEvent({
    eventType: UsageEventType.SITE_PAUSED,
    siteId: site.id,
    userId: site.userId,
  });
  return updated;
}

export async function resumeSiteForUser(siteId: string, userId: string) {
  const site = await prisma.site.findFirst({
    where: { id: siteId, userId },
    include: {
      domains: true,
      securityProfile: true,
      deployments: { orderBy: { createdAt: "desc" }, take: 1 },
    },
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
    include: { domains: true, securityProfile: true },
  });

  await refreshNginxForSite(updated);
  await noteSiteStatusChange({
    siteId: site.id,
    userId: site.userId,
    nextStatus: SiteStatus.ACTIVE,
  });
  void recordUsageEvent({
    eventType: UsageEventType.SITE_RESUMED,
    siteId: site.id,
    userId: site.userId,
  });
  return updated;
}

export async function deleteSiteForUser(siteId: string, userId: string) {
  const site = await prisma.site.findFirst({
    where: { id: siteId, userId },
    include: { domains: true, securityProfile: true },
  });

  if (!site) {
    throw new Error("Site not found");
  }

  const sandboxHosts = site.domains
    .filter((domain) => domain.type === DomainType.FREE_SUBDOMAIN)
    .map((domain) => domain.hostname.toLowerCase());

  await prisma.site.delete({ where: { id: siteId } });
  await noteSiteDeleted({
    siteId,
    userId,
    previousStatus: site.status,
  });

  await ensureRuntimeDirectories();
  const poolFile = phpPoolPath(site.slug);
  const socketFile = phpSocketPath(site.slug);
  await fs.rm(poolFile, { force: true }).catch(() => undefined);
  await fs.rm(socketFile, { force: true }).catch(() => undefined);
  try {
    await execAsync(`sudo systemctl reload ${PHP_FPM_SERVICE}`);
  } catch (error) {
    console.error("Failed to reload PHP-FPM after site deletion", error);
  }

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

  void recordUsageEvent({
    eventType: UsageEventType.SITE_DELETED,
    siteId: siteId,
    userId: site.userId,
  });
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
  options?: { tls?: NginxTlsConfig; runtime?: SiteRuntime; phpSocket?: string | null },
) {
  const serverNames = hostname.includes(".") && !hostname.endsWith(env.PLATFORM_FREE_DOMAIN)
    ? `${hostname} www.${hostname}`
    : hostname;

  const phpEnabled = options?.runtime === SiteRuntime.PHP && options.phpSocket;
  const phpBlock = phpEnabled
    ? `
    location ~ \\.php$ {
        try_files $uri =404;
        include fastcgi_params;
        fastcgi_split_path_info ^(.+\\.php)(/.+)$;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        fastcgi_param PATH_INFO $fastcgi_path_info;
        fastcgi_intercept_errors on;
        fastcgi_pass unix:${options?.phpSocket};
    }`
    : "";

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
    client_max_body_size ${env.MAX_ARCHIVE_SIZE_MB}M;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(?:css|js|json|txt|xml|ico|png|jpg|jpeg|gif|webp|svg|woff2?)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    location ~ /\.well-known/acme-challenge/ {
        allow all;
    }

    location ~ /\.(?!well-known).* {
        deny all;
    }${phpBlock}
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
    client_max_body_size ${env.MAX_ARCHIVE_SIZE_MB}M;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(?:css|js|json|txt|xml|ico|png|jpg|jpeg|gif|webp|svg|woff2?)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    location ~ /\.well-known/acme-challenge/ {
        allow all;
    }

    location ~ /\.(?!well-known).* {
        deny all;
    }${phpBlock}
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

async function refreshPhpRuntime(site: SiteWithRelations): Promise<string | null> {
  await ensureRuntimeDirectories();
  const poolFile = phpPoolPath(site.slug);
  const socketFile = phpSocketPath(site.slug);

  const targetRuntime = site.runtime === SiteRuntime.PHP && site.securityProfile?.runtime === SiteRuntime.PHP;

  if (!targetRuntime) {
    await fs.rm(poolFile, { force: true }).catch(() => undefined);
    await fs.rm(socketFile, { force: true }).catch(() => undefined);
    try {
      await execAsync(`sudo systemctl reload ${PHP_FPM_SERVICE}`);
    } catch (error) {
      console.error("Failed to reload PHP-FPM after removing pool", error);
    }
    return null;
  }

  const profile = site.securityProfile!;
  const disabledFuncs = profile.phpDisabledFuncs.length > 0
    ? profile.phpDisabledFuncs.join(",")
    : "exec,shell_exec,passthru,system,proc_open,popen,pcntl_exec";
  const openBaseDir = profile.phpOpenBaseDir ?? site.storagePath;
  const sessionsDir = path.join(site.storagePath, ".sessions");
  await fs.mkdir(sessionsDir, { recursive: true });

  const maxChildren = Math.max(2, profile.processLimit);
  const startServers = Math.min(Math.max(2, Math.ceil(maxChildren / 2)), maxChildren);
  const maxSpare = Math.min(4, maxChildren);

  const config = `
[noesis_${site.slug}]
user = www-data
group = www-data
listen = ${socketFile}
listen.owner = www-data
listen.group = www-data
listen.mode = 0660
pm = dynamic
pm.max_children = ${maxChildren}
pm.start_servers = ${startServers}
pm.min_spare_servers = 1
pm.max_spare_servers = ${maxSpare}
pm.max_requests = 200
request_terminate_timeout = 30s
catch_workers_output = yes
php_admin_value[open_basedir] = ${openBaseDir}:${sessionsDir}:/tmp
php_admin_value[disable_functions] = ${disabledFuncs}
php_admin_value[expose_php] = Off
php_admin_value[display_errors] = Off
php_admin_value[log_errors] = On
php_admin_value[memory_limit] = ${profile.memoryLimitMb}M
php_admin_value[post_max_size] = ${env.MAX_ARCHIVE_SIZE_MB}M
php_admin_value[upload_max_filesize] = ${env.MAX_ARCHIVE_SIZE_MB}M
php_admin_value[max_execution_time] = 30
php_admin_value[max_input_time] = 30
php_admin_value[max_input_vars] = 2000
php_admin_value[cgi.fix_pathinfo] = 0
php_admin_value[session.save_path] = ${sessionsDir}
php_admin_flag[session.cookie_secure] = 1
php_admin_flag[session.cookie_httponly] = 1
security.limit_extensions = .php .php3 .php4 .php5 .php7 .php8
env[PATH] = /usr/local/bin:/usr/bin:/bin
chdir = ${site.storagePath}
`;

  await fs.writeFile(poolFile, config.trimStart(), "utf8");

  try {
    await execAsync(`sudo systemctl reload ${PHP_FPM_SERVICE}`);
  } catch (error) {
    console.error("Failed to reload PHP-FPM", error);
    throw new Error("Runtime updated but php-fpm reload failed. Please reload manually.");
  }

  return socketFile;
}

export async function refreshNginxForSite(site: SiteWithRelations) {
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

  const phpSocket = await refreshPhpRuntime(site);

  const writes = site.domains.map(async (domain) => {
    const normalized = domain.hostname.toLowerCase();
    const snippetPath = snippetPathForHost(normalized);
    const isSandbox = domain.type === DomainType.FREE_SUBDOMAIN;
    const config = buildNginxServerBlock(normalized, site.storagePath, site.status, {
      tls: isSandbox ? sandboxTls ?? undefined : undefined,
      runtime: site.runtime,
      phpSocket,
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
