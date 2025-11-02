-- CreateEnum
CREATE TYPE "AuthEventType" AS ENUM ('SIGNUP', 'LOGIN_SUCCESS', 'LOGIN_FAILURE', 'SESSION_CREATED');

-- AlterTable
ALTER TABLE "SiteAnalytics" ALTER COLUMN "riskReasons" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "SiteSecurityProfile" ALTER COLUMN "phpDisabledFuncs" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "UserAnalytics" ADD COLUMN     "distinctIpCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "distinctUserAgentCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastLoginCity" TEXT,
ADD COLUMN     "lastLoginCountry" TEXT,
ADD COLUMN     "lastLoginUserAgent" TEXT,
ADD COLUMN     "totalLoginFailures" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalLogins" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "riskReasons" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "IpAddressInsight" (
    "ipAddress" TEXT NOT NULL,
    "city" TEXT,
    "region" TEXT,
    "country" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "timezone" TEXT,
    "postal" TEXT,
    "org" TEXT,
    "asn" TEXT,
    "asnName" TEXT,
    "asnDomain" TEXT,
    "asnType" TEXT,
    "carrierName" TEXT,
    "carrierMcc" TEXT,
    "carrierMnc" TEXT,
    "host" TEXT,
    "threatLevel" TEXT,
    "proxyType" TEXT,
    "isBogon" BOOLEAN NOT NULL DEFAULT false,
    "raw" JSONB,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "IpAddressInsight_pkey" PRIMARY KEY ("ipAddress")
);

-- CreateTable
CREATE TABLE "UserAccessLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "sessionId" TEXT,
    "email" TEXT,
    "eventType" "AuthEventType" NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "clientBrowser" TEXT,
    "clientBrowserVersion" TEXT,
    "clientOs" TEXT,
    "clientOsVersion" TEXT,
    "clientDevice" TEXT,
    "clientPlatform" TEXT,
    "clientEngine" TEXT,
    "isMobile" BOOLEAN,
    "isBot" BOOLEAN,
    "geoCity" TEXT,
    "geoRegion" TEXT,
    "geoCountry" TEXT,
    "geoTimezone" TEXT,
    "geoLoc" TEXT,
    "isp" TEXT,
    "org" TEXT,
    "confidence" DOUBLE PRECISION,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserAccessLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserAccessLog_userId_occurredAt_idx" ON "UserAccessLog"("userId", "occurredAt");

-- CreateIndex
CREATE INDEX "UserAccessLog_email_occurredAt_idx" ON "UserAccessLog"("email", "occurredAt");

-- CreateIndex
CREATE INDEX "UserAccessLog_ipAddress_occurredAt_idx" ON "UserAccessLog"("ipAddress", "occurredAt");

-- CreateIndex
CREATE INDEX "UserAccessLog_eventType_occurredAt_idx" ON "UserAccessLog"("eventType", "occurredAt");

-- AddForeignKey
ALTER TABLE "UserAccessLog" ADD CONSTRAINT "UserAccessLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAccessLog" ADD CONSTRAINT "UserAccessLog_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAccessLog" ADD CONSTRAINT "UserAccessLog_ipAddress_fkey" FOREIGN KEY ("ipAddress") REFERENCES "IpAddressInsight"("ipAddress") ON DELETE SET NULL ON UPDATE CASCADE;
