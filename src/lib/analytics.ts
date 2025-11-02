import { AuthEventType, DomainStatus, DomainType, Prisma, SiteRuntime, SiteStatus } from "@prisma/client";
import { prisma } from "./prisma";
import { recordUserAccessEvent } from "./user-access";

type Transaction = Prisma.TransactionClient;
type Client = Transaction | typeof prisma;

function getClient(tx?: Transaction): Client {
  return tx ?? prisma;
}

type AuthContext = {
  ip?: string | null;
  userAgent?: string | null;
  sessionId?: string | null;
  metadata?: Record<string, unknown>;
};

function deriveSiteRisk(params: {
  failedDeployments: number;
  lastMalwareScanPassed: boolean | null | undefined;
  dnsVerified: boolean;
  proxiedThroughCloudflare: boolean;
  status: SiteStatus | null | undefined;
}): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;

  if (params.failedDeployments > 0) {
    const failureComponent = Math.min(params.failedDeployments * 12, 40);
    score += failureComponent;
    reasons.push(`${params.failedDeployments} failed deployment${params.failedDeployments > 1 ? "s" : ""}`);
  }

  if (params.lastMalwareScanPassed === false) {
    score += 35;
    reasons.push("Last malware scan failed");
  }

  if (!params.dnsVerified) {
    score += 15;
    reasons.push("Primary domain not verified");
  }

  if (params.proxiedThroughCloudflare) {
    score += 5;
    reasons.push("Domain proxied through Cloudflare");
  }

  if (params.status === SiteStatus.DISABLED) {
    score += 5;
    reasons.push("Site currently paused");
  }

  score = Math.min(score, 100);
  return { score, reasons };
}

function deriveUserRisk(params: {
  failedLoginAttempts: number;
  abuseReports: number;
  totalSites: number;
  pausedSites: number;
  totalDeployments: number;
}): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;

  if (params.failedLoginAttempts > 3) {
    const extraAttempts = params.failedLoginAttempts - 3;
    score += Math.min(extraAttempts * 5, 30);
    reasons.push(`${params.failedLoginAttempts} failed login attempts`);
  }

  if (params.abuseReports > 0) {
    score += Math.min(params.abuseReports * 20, 40);
    reasons.push(`${params.abuseReports} abuse report${params.abuseReports > 1 ? "s" : ""}`);
  }

  if (params.pausedSites > Math.ceil(params.totalSites / 2) && params.totalSites > 0) {
    score += 10;
    reasons.push("More than half of the sites are paused");
  }

  if (params.totalDeployments === 0 && params.totalSites > 0) {
    score += 5;
    reasons.push("Sites created but never deployed");
  }

  score = Math.min(score, 100);
  return { score, reasons };
}

async function refreshSiteRisk(siteId: string, client: Client) {
  const analytics = await client.siteAnalytics.findUnique({ where: { siteId } });
  if (!analytics) return;
  const { score, reasons } = deriveSiteRisk({
    failedDeployments: analytics.failedDeployments,
    lastMalwareScanPassed: analytics.lastMalwareScanPassed,
    dnsVerified: analytics.dnsVerified,
    proxiedThroughCloudflare: analytics.proxiedThroughCloudflare,
    status: analytics.lastStatus,
  });

  if (analytics.riskScore !== score || analytics.riskReasons.join("|") !== reasons.join("|")) {
    await client.siteAnalytics.update({
      where: { siteId },
      data: { riskScore: score, riskReasons: reasons },
    });
  }
}

async function refreshUserRisk(userId: string, client: Client) {
  const analytics = await client.userAnalytics.findUnique({ where: { userId } });
  if (!analytics) return;
  const { score, reasons } = deriveUserRisk({
    failedLoginAttempts: analytics.failedLoginAttempts,
    abuseReports: analytics.abuseReports,
    totalSites: analytics.totalSites,
    pausedSites: analytics.pausedSites,
    totalDeployments: analytics.totalDeployments,
  });

  if (analytics.riskScore !== score || analytics.riskReasons.join("|") !== reasons.join("|")) {
    await client.userAnalytics.update({
      where: { userId },
      data: { riskScore: score, riskReasons: reasons },
    });
  }
}

export async function ensureUserAnalytics(userId: string, tx?: Transaction) {
  const client = getClient(tx);
  await client.userAnalytics.upsert({
    where: { userId },
    create: { userId, riskReasons: [] },
    update: {},
  });
}

export async function ensureSiteAnalytics(siteId: string, tx?: Transaction) {
  const client = getClient(tx);
  await client.siteAnalytics.upsert({
    where: { siteId },
    create: { siteId, riskReasons: [] },
    update: {},
  });
}

export async function noteUserRegistration(userId: string, context?: AuthContext, tx?: Transaction) {
  await ensureUserAnalytics(userId, tx);
  await recordUserAccessEvent({
    userId,
    eventType: AuthEventType.SIGNUP,
    ipAddress: context?.ip,
    userAgent: context?.userAgent,
    metadata: context?.metadata,
  });
}

async function updateAccessStats(userId: string, client: Client) {
  const [distinctIpCount, distinctUserAgentCount, totalLogins, totalLoginFailures] = await Promise.all([
    prisma.userAccessLog
      .findMany({
        where: { userId, ipAddress: { not: null } },
        distinct: ["ipAddress"],
        select: { ipAddress: true },
      })
      .then((rows) => rows.length),
    prisma.userAccessLog
      .findMany({
        where: { userId, userAgent: { not: null } },
        distinct: ["userAgent"],
        select: { userAgent: true },
      })
      .then((rows) => rows.length),
    prisma.userAccessLog.count({
      where: { userId, eventType: AuthEventType.LOGIN_SUCCESS },
    }),
    prisma.userAccessLog.count({
      where: { userId, eventType: AuthEventType.LOGIN_FAILURE },
    }),
  ]);

  await client.userAnalytics.update({
    where: { userId },
    data: {
      distinctIpCount,
      distinctUserAgentCount,
      totalLogins,
      totalLoginFailures,
    },
  });
}

export async function noteUserLogin(userId: string, context?: AuthContext, tx?: Transaction) {
  const client = getClient(tx);
  await ensureUserAnalytics(userId, tx);

  const { log } = await recordUserAccessEvent({
    userId,
    eventType: AuthEventType.LOGIN_SUCCESS,
    ipAddress: context?.ip,
    userAgent: context?.userAgent,
    sessionId: context?.sessionId ?? undefined,
    metadata: context?.metadata,
  });

  await client.userAnalytics.upsert({
    where: { userId },
    create: {
      userId,
      lastLoginAt: new Date(),
      lastLoginIp: log.ipAddress ?? context?.ip ?? undefined,
      failedLoginAttempts: 0,
      lastLoginUserAgent: log.userAgent ?? context?.userAgent ?? undefined,
      lastLoginCity: log.geoCity ?? undefined,
      lastLoginCountry: log.geoCountry ?? undefined,
      totalLogins: 1,
      distinctIpCount: log.ipAddress ? 1 : 0,
      distinctUserAgentCount: log.userAgent ? 1 : 0,
      riskReasons: [],
    },
    update: {
      lastLoginAt: new Date(),
      lastLoginIp: log.ipAddress ?? context?.ip ?? undefined,
      failedLoginAttempts: 0,
      lastLoginUserAgent: log.userAgent ?? context?.userAgent ?? undefined,
      lastLoginCity: log.geoCity ?? undefined,
      lastLoginCountry: log.geoCountry ?? undefined,
      totalLogins: { increment: 1 },
    },
  });

  await updateAccessStats(userId, client);
  await refreshUserRisk(userId, client);
}

export async function noteFailedLogin(email: string, context?: AuthContext) {
  await recordUserAccessEvent({
    email,
    eventType: AuthEventType.LOGIN_FAILURE,
    ipAddress: context?.ip,
    userAgent: context?.userAgent,
    metadata: context?.metadata,
  });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return;

  await prisma.userAnalytics.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      failedLoginAttempts: 1,
      lastLoginIp: context?.ip ?? undefined,
      totalLoginFailures: 1,
      riskReasons: [],
    },
    update: {
      failedLoginAttempts: { increment: 1 },
      lastLoginIp: context?.ip ?? undefined,
      totalLoginFailures: { increment: 1 },
    },
  });

  await updateAccessStats(user.id, prisma);
  await refreshUserRisk(user.id, prisma);
}

export async function noteSiteCreated(
  params: {
    siteId: string;
    userId: string;
    status: SiteStatus;
    runtime: SiteRuntime;
    domains: { type: DomainType; isPrimary: boolean; verificationStatus: DomainStatus }[];
  },
  tx?: Transaction,
) {
  const client = getClient(tx);
  const primaryDomain = params.domains.find((domain) => domain.isPrimary) ?? params.domains[0];
  const dnsVerified =
    primaryDomain?.type === DomainType.FREE_SUBDOMAIN ||
    primaryDomain?.verificationStatus === DomainStatus.VERIFIED;

  await client.siteAnalytics.upsert({
    where: { siteId: params.siteId },
    create: {
      siteId: params.siteId,
      dnsVerified,
      lastStatus: params.status,
      runtime: params.runtime,
      riskReasons: [],
    },
    update: {
      dnsVerified,
      lastStatus: params.status,
      runtime: params.runtime,
    },
  });

  await client.userAnalytics.upsert({
    where: { userId: params.userId },
    create: {
      userId: params.userId,
      totalSites: 1,
      activeSites: params.status === SiteStatus.ACTIVE ? 1 : 0,
      pausedSites: params.status === SiteStatus.DISABLED ? 1 : 0,
      riskReasons: [],
    },
    update: {
      totalSites: { increment: 1 },
      ...(params.status === SiteStatus.ACTIVE ? { activeSites: { increment: 1 } } : {}),
      ...(params.status === SiteStatus.DISABLED ? { pausedSites: { increment: 1 } } : {}),
    },
  });

  await refreshSiteRisk(params.siteId, client);
  await refreshUserRisk(params.userId, client);
}

export async function noteSiteStatusChange(
  params: {
    siteId: string;
    userId: string;
    nextStatus: SiteStatus;
  },
  tx?: Transaction,
) {
  const client = getClient(tx);
  const existing = await client.siteAnalytics.findUnique({ where: { siteId: params.siteId } });
  const previousStatus = existing?.lastStatus ?? null;

  await client.siteAnalytics.upsert({
    where: { siteId: params.siteId },
    create: {
      siteId: params.siteId,
      lastStatus: params.nextStatus,
      pausedAt: params.nextStatus === SiteStatus.DISABLED ? new Date() : undefined,
      riskReasons: [],
    },
    update: {
      lastStatus: params.nextStatus,
      pausedAt: params.nextStatus === SiteStatus.DISABLED ? new Date() : null,
    },
  });

  await client.userAnalytics.upsert({
    where: { userId: params.userId },
    create: {
      userId: params.userId,
      totalSites: 1,
      activeSites: params.nextStatus === SiteStatus.ACTIVE ? 1 : 0,
      pausedSites: params.nextStatus === SiteStatus.DISABLED ? 1 : 0,
      riskReasons: [],
    },
    update: {
      ...(previousStatus === SiteStatus.ACTIVE ? { activeSites: { decrement: 1 } } : {}),
      ...(previousStatus === SiteStatus.DISABLED ? { pausedSites: { decrement: 1 } } : {}),
      ...(params.nextStatus === SiteStatus.ACTIVE ? { activeSites: { increment: 1 } } : {}),
      ...(params.nextStatus === SiteStatus.DISABLED ? { pausedSites: { increment: 1 } } : {}),
    },
  });

  await refreshSiteRisk(params.siteId, client);
  await refreshUserRisk(params.userId, client);
}

export async function noteSiteDeleted(
  params: {
    siteId: string;
    userId: string;
    previousStatus: SiteStatus;
  },
  tx?: Transaction,
) {
  const client = getClient(tx);
  await client.userAnalytics.upsert({
    where: { userId: params.userId },
    create: {
      userId: params.userId,
      riskReasons: [],
    },
    update: {
      totalSites: { decrement: 1 },
      ...(params.previousStatus === SiteStatus.ACTIVE ? { activeSites: { decrement: 1 } } : {}),
      ...(params.previousStatus === SiteStatus.DISABLED ? { pausedSites: { decrement: 1 } } : {}),
    },
  });

  await refreshUserRisk(params.userId, client);
}

export async function noteDeploymentResult(
  params: {
    siteId: string;
    userId: string;
    bytesUploaded: number;
    success: boolean;
    malwareScanPassed: boolean;
    runtime: SiteRuntime;
  },
  tx?: Transaction,
) {
  const client = getClient(tx);
  const bytes = BigInt(params.bytesUploaded);

  await client.siteAnalytics.upsert({
    where: { siteId: params.siteId },
    create: {
      siteId: params.siteId,
      totalDeployments: 1,
      successfulDeployments: params.success ? 1 : 0,
      failedDeployments: params.success ? 0 : 1,
      totalUploads: 1,
      totalBytesUploaded: bytes,
      lastDeploymentAt: new Date(),
      lastDeploymentSizeBytes: bytes,
      lastMalwareScanAt: new Date(),
      lastMalwareScanPassed: params.malwareScanPassed,
      lastStatus: params.success ? SiteStatus.ACTIVE : null,
      runtime: params.runtime,
      riskReasons: [],
    },
    update: {
      totalDeployments: { increment: 1 },
      totalUploads: { increment: 1 },
      totalBytesUploaded: { increment: bytes },
      lastDeploymentAt: new Date(),
      lastDeploymentSizeBytes: bytes,
      lastMalwareScanAt: new Date(),
      lastMalwareScanPassed: params.malwareScanPassed,
      runtime: params.runtime,
      ...(params.success
        ? {
            successfulDeployments: { increment: 1 },
            lastStatus: SiteStatus.ACTIVE,
          }
        : {
            failedDeployments: { increment: 1 },
          }),
    },
  });

  await client.userAnalytics.upsert({
    where: { userId: params.userId },
    create: {
      userId: params.userId,
      totalDeployments: params.success ? 1 : 0,
      riskReasons: [],
    },
    update: params.success
      ? {
          totalDeployments: { increment: 1 },
        }
      : {},
  });

  await refreshSiteRisk(params.siteId, client);
  await refreshUserRisk(params.userId, client);
}

export async function noteDomainInsight(
  params: {
    siteId: string;
    dnsVerified: boolean;
    proxied: boolean;
  },
  tx?: Transaction,
) {
  const client = getClient(tx);
  await client.siteAnalytics.upsert({
    where: { siteId: params.siteId },
    create: {
      siteId: params.siteId,
      dnsVerified: params.dnsVerified,
      proxiedThroughCloudflare: params.proxied,
      riskReasons: [],
    },
    update: {
      dnsVerified: params.dnsVerified,
      proxiedThroughCloudflare: params.proxied,
    },
  });

  await refreshSiteRisk(params.siteId, client);
}
