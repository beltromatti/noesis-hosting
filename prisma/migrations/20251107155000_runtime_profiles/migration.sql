-- CreateEnum
CREATE TYPE "SiteRuntime" AS ENUM ('STATIC', 'PHP');

-- CreateEnum
CREATE TYPE "SecurityScanStatus" AS ENUM ('UNKNOWN', 'PASS', 'WARN', 'FAIL');

-- AlterTable
ALTER TABLE "Site"
ADD COLUMN     "runtime" "SiteRuntime" NOT NULL DEFAULT 'STATIC';

-- AlterTable
ALTER TABLE "SiteAnalytics"
ADD COLUMN     "runtime" "SiteRuntime";

-- CreateTable
CREATE TABLE "SiteSecurityProfile" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "runtime" "SiteRuntime" NOT NULL DEFAULT 'STATIC',
    "isolated" BOOLEAN NOT NULL DEFAULT TRUE,
    "cpuLimitPercent" INTEGER NOT NULL DEFAULT 20,
    "memoryLimitMb" INTEGER NOT NULL DEFAULT 256,
    "storageLimitMb" INTEGER NOT NULL DEFAULT 200,
    "processLimit" INTEGER NOT NULL DEFAULT 8,
    "lastScanAt" TIMESTAMP(3),
    "lastScanStatus" "SecurityScanStatus" NOT NULL DEFAULT 'UNKNOWN',
    "lastScanNotes" TEXT,
    "phpOpenBaseDir" TEXT,
    "phpDisabledFuncs" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SiteSecurityProfile_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "SiteSecurityProfile_siteId_key" UNIQUE ("siteId"),
    CONSTRAINT "SiteSecurityProfile_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Data backfill
INSERT INTO "SiteSecurityProfile" ("id", "siteId", "runtime", "phpOpenBaseDir", "phpDisabledFuncs")
SELECT substr(md5(random()::text), 1, 24), "id", 'STATIC', "storagePath", ARRAY['exec','shell_exec','passthru','system','proc_open','popen','pcntl_exec']
FROM "Site"
ON CONFLICT ("siteId") DO NOTHING;

UPDATE "SiteAnalytics" SET "runtime" = 'STATIC' WHERE "runtime" IS NULL;
