-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "UsageEventType" AS ENUM (
    'USER_REGISTERED',
    'USER_LOGIN',
    'USER_LOGIN_FAILED',
    'SITE_CREATED',
    'SITE_DEPLOYED',
    'SITE_DEPLOYMENT_FAILED',
    'SITE_PAUSED',
    'SITE_RESUMED',
    'SITE_DELETED',
    'DOMAIN_UPDATED',
    'SECURITY_UPDATED',
    'DOMAIN_REQUESTED',
    'DOMAIN_VERIFICATION_FAILED'
);

-- AlterTable
ALTER TABLE "User"
ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'USER';

-- CreateTable
CREATE TABLE "UsageEvent" (
    "id" TEXT NOT NULL,
    "eventType" "UsageEventType" NOT NULL,
    "userId" TEXT,
    "siteId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsageEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserAnalytics" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "totalSites" INTEGER NOT NULL DEFAULT 0,
    "activeSites" INTEGER NOT NULL DEFAULT 0,
    "pausedSites" INTEGER NOT NULL DEFAULT 0,
    "totalDeployments" INTEGER NOT NULL DEFAULT 0,
    "lastLoginAt" TIMESTAMP(3),
    "lastLoginIp" TEXT,
    "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
    "abuseReports" INTEGER NOT NULL DEFAULT 0,
    "riskScore" INTEGER NOT NULL DEFAULT 0,
    "riskReasons" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserAnalytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteAnalytics" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "totalDeployments" INTEGER NOT NULL DEFAULT 0,
    "successfulDeployments" INTEGER NOT NULL DEFAULT 0,
    "failedDeployments" INTEGER NOT NULL DEFAULT 0,
    "totalUploads" INTEGER NOT NULL DEFAULT 0,
    "totalBytesUploaded" BIGINT NOT NULL DEFAULT 0,
    "lastDeploymentAt" TIMESTAMP(3),
    "lastDeploymentSizeBytes" BIGINT,
    "lastMalwareScanAt" TIMESTAMP(3),
    "lastMalwareScanPassed" BOOLEAN,
    "dnsVerified" BOOLEAN NOT NULL DEFAULT false,
    "proxiedThroughCloudflare" BOOLEAN NOT NULL DEFAULT false,
    "pausedAt" TIMESTAMP(3),
    "lastStatus" "SiteStatus",
    "riskScore" INTEGER NOT NULL DEFAULT 0,
    "riskReasons" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SiteAnalytics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UsageEvent_eventType_createdAt_idx" ON "UsageEvent"("eventType", "createdAt");

-- CreateIndex
CREATE INDEX "UsageEvent_userId_createdAt_idx" ON "UsageEvent"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "UsageEvent_siteId_createdAt_idx" ON "UsageEvent"("siteId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserAnalytics_userId_key" ON "UserAnalytics"("userId");

-- CreateIndex
CREATE INDEX "UserAnalytics_riskScore_updatedAt_idx" ON "UserAnalytics"("riskScore", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "SiteAnalytics_siteId_key" ON "SiteAnalytics"("siteId");

-- CreateIndex
CREATE INDEX "SiteAnalytics_riskScore_updatedAt_idx" ON "SiteAnalytics"("riskScore", "updatedAt");

-- CreateIndex
CREATE INDEX "SiteAnalytics_dnsVerified_updatedAt_idx" ON "SiteAnalytics"("dnsVerified", "updatedAt");

-- AddForeignKey
ALTER TABLE "UsageEvent"
ADD CONSTRAINT "UsageEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageEvent"
ADD CONSTRAINT "UsageEvent_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAnalytics"
ADD CONSTRAINT "UserAnalytics_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteAnalytics"
ADD CONSTRAINT "SiteAnalytics_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;
