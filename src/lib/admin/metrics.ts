import {
  Prisma,
  SecurityScanStatus,
  SiteRuntime,
  SiteStatus,
  UsageEventType,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";

const DAY_MS = 24 * 60 * 60 * 1000;

type TimelineBucket = {
  deployments: number;
  registrations: number;
  failures: number;
};

type SiteAnalyticsEntry = Prisma.SiteAnalyticsGetPayload<{
  include: {
    site: {
      include: {
        user: { select: { email: true } };
        domains: { select: { hostname: true; isPrimary: true } };
        securityProfile: true;
      };
    };
  };
}>;

type UserAnalyticsEntry = Prisma.UserAnalyticsGetPayload<{
  include: {
    user: {
      select: {
        email: true;
        fullName: true;
        createdAt: true;
      };
    };
  };
}>;

function toNumber(value: bigint | null | undefined) {
  return value ? Number(value) : 0;
}

function buildEmptyTimeline(days: number) {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const buckets = new Map<string, TimelineBucket>();
  for (let index = days - 1; index >= 0; index -= 1) {
    const date = new Date(today.getTime() - index * DAY_MS);
    const key = date.toISOString();
    buckets.set(key, {
      deployments: 0,
      registrations: 0,
      failures: 0,
    });
  }
  return buckets;
}

function normaliseDateKey(date: Date) {
  const copy = new Date(date);
  copy.setUTCHours(0, 0, 0, 0);
  return copy.toISOString();
}

function serialiseSiteAnalyticsRow(row: SiteAnalyticsEntry) {
  return {
    siteId: row.siteId,
    name: row.site.name,
    slug: row.site.slug,
    status: row.site.status,
    runtime: row.runtime ?? row.site.runtime,
    ownerEmail: row.site.user.email,
    primaryDomain: row.site.domains.find((domain) => domain.isPrimary)?.hostname ?? null,
    totalDeployments: row.totalDeployments,
    successfulDeployments: row.successfulDeployments,
    failedDeployments: row.failedDeployments,
    totalUploads: row.totalUploads,
    totalBytesUploaded: toNumber(row.totalBytesUploaded),
    lastDeploymentAt: row.lastDeploymentAt ? row.lastDeploymentAt.toISOString() : null,
    dnsVerified: row.dnsVerified,
    proxiedThroughCloudflare: row.proxiedThroughCloudflare,
    riskScore: row.riskScore,
    riskReasons: row.riskReasons,
    createdAt: row.site.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    securityProfile: row.site.securityProfile
      ? {
          runtime: row.site.securityProfile.runtime,
          cpuLimitPercent: row.site.securityProfile.cpuLimitPercent,
          memoryLimitMb: row.site.securityProfile.memoryLimitMb,
          storageLimitMb: row.site.securityProfile.storageLimitMb,
          processLimit: row.site.securityProfile.processLimit,
          lastScanAt: row.site.securityProfile.lastScanAt ? row.site.securityProfile.lastScanAt.toISOString() : null,
          lastScanStatus: row.site.securityProfile.lastScanStatus,
          lastScanNotes: row.site.securityProfile.lastScanNotes,
        }
      : null,
  };
}

function serialiseUserAnalyticsRow(row: UserAnalyticsEntry) {
  return {
    userId: row.userId,
    email: row.user.email,
    fullName: row.user.fullName,
    totalSites: row.totalSites,
    activeSites: row.activeSites,
    pausedSites: row.pausedSites,
    totalDeployments: row.totalDeployments,
    lastLoginAt: row.lastLoginAt ? row.lastLoginAt.toISOString() : null,
    lastLoginIp: row.lastLoginIp,
    failedLoginAttempts: row.failedLoginAttempts,
    riskScore: row.riskScore,
    riskReasons: row.riskReasons,
    createdAt: row.user.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function loadAdminMetrics() {
  const now = Date.now();
  const sevenDaysAgo = new Date(now - 7 * DAY_MS);
  const fourteenDaysAgo = new Date(now - 13 * DAY_MS);

  const [
    totalUsers,
    totalSites,
    activeSites,
    pausedSites,
    totalDeployments,
    totalDomains,
    storageAggregate,
    highRiskSitesCount,
    highRiskUsersCount,
    dnsIssuesCount,
    proxiedCount,
    newUsersLast7,
    deploymentsLast7,
    deploymentsLast24h,
    phpSites,
    staticSites,
    securityAlerts,
    securityFailures,
  ] = await prisma.$transaction([
    prisma.user.count(),
    prisma.site.count(),
    prisma.site.count({ where: { status: SiteStatus.ACTIVE } }),
    prisma.site.count({ where: { status: SiteStatus.DISABLED } }),
    prisma.deployment.count(),
    prisma.siteDomain.count(),
    prisma.siteAnalytics.aggregate({
      _sum: { totalBytesUploaded: true },
    }),
    prisma.siteAnalytics.count({
      where: { riskScore: { gte: 50 } },
    }),
    prisma.userAnalytics.count({
      where: { riskScore: { gte: 50 } },
    }),
    prisma.siteAnalytics.count({
      where: { dnsVerified: false },
    }),
    prisma.siteAnalytics.count({
      where: { proxiedThroughCloudflare: true },
    }),
    prisma.usageEvent.count({
      where: {
        eventType: UsageEventType.USER_REGISTERED,
        createdAt: { gte: sevenDaysAgo },
      },
    }),
    prisma.usageEvent.count({
      where: {
        eventType: UsageEventType.SITE_DEPLOYED,
        createdAt: { gte: sevenDaysAgo },
      },
    }),
    prisma.usageEvent.count({
      where: {
        eventType: UsageEventType.SITE_DEPLOYED,
        createdAt: { gte: new Date(now - DAY_MS) },
      },
    }),
    prisma.site.count({ where: { runtime: SiteRuntime.PHP } }),
    prisma.site.count({ where: { runtime: SiteRuntime.STATIC } }),
    prisma.siteSecurityProfile.count({
      where: { lastScanStatus: { in: [SecurityScanStatus.WARN, SecurityScanStatus.FAIL] } },
    }),
    prisma.siteSecurityProfile.count({
      where: { lastScanStatus: SecurityScanStatus.FAIL },
    }),
  ]);

  const timelineEvents = await prisma.usageEvent.findMany({
    where: {
      createdAt: { gte: fourteenDaysAgo },
      eventType: {
        in: [
          UsageEventType.SITE_DEPLOYED,
          UsageEventType.USER_REGISTERED,
          UsageEventType.SITE_DEPLOYMENT_FAILED,
        ],
      },
    },
    select: {
      createdAt: true,
      eventType: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const timelineBuckets = buildEmptyTimeline(14);
  for (const event of timelineEvents) {
    const key = normaliseDateKey(event.createdAt);
    const bucket = timelineBuckets.get(key);
    if (!bucket) continue;
    switch (event.eventType) {
      case UsageEventType.SITE_DEPLOYED:
        bucket.deployments += 1;
        break;
      case UsageEventType.USER_REGISTERED:
        bucket.registrations += 1;
        break;
      case UsageEventType.SITE_DEPLOYMENT_FAILED:
        bucket.failures += 1;
        break;
      default:
        break;
    }
  }

  const timeline = Array.from(timelineBuckets.entries()).map(([key, value]) => ({
    date: key,
    ...value,
  }));

  const topSitesRaw = await prisma.siteAnalytics.findMany({
    orderBy: { totalDeployments: "desc" },
    take: 8,
    include: {
      site: {
        include: {
          user: { select: { email: true } },
          domains: { select: { hostname: true, isPrimary: true } },
          securityProfile: true,
        },
      },
    },
  });

  const highRiskSitesRaw = await prisma.siteAnalytics.findMany({
    where: { riskScore: { gte: 50 } },
    orderBy: { riskScore: "desc" },
    take: 8,
    include: {
      site: {
        include: {
          user: { select: { email: true } },
          domains: { select: { hostname: true, isPrimary: true } },
          securityProfile: true,
        },
      },
    },
  });

  const highRiskUsersRaw = await prisma.userAnalytics.findMany({
    where: { riskScore: { gte: 40 } },
    orderBy: [{ riskScore: "desc" }, { totalSites: "desc" }],
    take: 8,
    include: {
      user: {
        select: { email: true, fullName: true, createdAt: true },
      },
    },
  });

  const recentDeployments = await prisma.deployment.findMany({
    orderBy: { createdAt: "desc" },
    take: 12,
    include: {
      site: {
        select: { name: true, slug: true, runtime: true, user: { select: { email: true } } },
      },
    },
  });

  const incidentEvents = await prisma.usageEvent.findMany({
    where: {
      eventType: {
        in: [
          UsageEventType.SITE_DEPLOYMENT_FAILED,
          UsageEventType.DOMAIN_VERIFICATION_FAILED,
        ],
      },
    },
    orderBy: { createdAt: "desc" },
    take: 12,
    include: {
      site: { select: { name: true } },
      user: { select: { email: true } },
    },
  });

  const recentUsersRaw = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    take: 8,
    include: {
      analytics: true,
    },
  });

  return {
    overview: {
      totalUsers,
      totalSites,
      activeSites,
      pausedSites,
      totalDeployments,
      totalDomains,
      totalStorageBytes: toNumber(storageAggregate._sum.totalBytesUploaded),
      highRiskSites: highRiskSitesCount,
      highRiskUsers: highRiskUsersCount,
      dnsIssues: dnsIssuesCount,
      proxiedCount,
      newUsersLast7,
      deploymentsLast7,
      deploymentsLast24h,
      phpSites,
      staticSites,
      securityAlerts,
      securityFailures,
    },
    timeline,
    topSites: topSitesRaw.map(serialiseSiteAnalyticsRow),
    highRiskSites: highRiskSitesRaw.map(serialiseSiteAnalyticsRow),
    highRiskUsers: highRiskUsersRaw.map(serialiseUserAnalyticsRow),
    recentDeployments: recentDeployments.map((deployment) => ({
      id: deployment.id,
      siteName: deployment.site.name,
      siteSlug: deployment.site.slug,
      runtime: deployment.site.runtime,
      status: deployment.status,
      ownerEmail: deployment.site.user.email,
      createdAt: deployment.createdAt.toISOString(),
      notes: deployment.notes,
    })),
    incidentEvents: incidentEvents.map((event) => ({
      id: event.id,
      eventType: event.eventType,
      createdAt: event.createdAt.toISOString(),
      userEmail: event.user?.email ?? null,
      siteName: event.site?.name ?? null,
      metadata: event.metadata,
    })),
    recentUsers: recentUsersRaw.map((user) => ({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      createdAt: user.createdAt.toISOString(),
      totalSites: user.analytics?.totalSites ?? 0,
      totalDeployments: user.analytics?.totalDeployments ?? 0,
      riskScore: user.analytics?.riskScore ?? 0,
      riskReasons: user.analytics?.riskReasons ?? [],
    })),
  };
}
