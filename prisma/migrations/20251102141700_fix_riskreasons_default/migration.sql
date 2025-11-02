-- AlterTable
ALTER TABLE "SiteAnalytics" ALTER COLUMN "riskReasons" SET DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "UserAnalytics" ALTER COLUMN "riskReasons" SET DEFAULT ARRAY[]::TEXT[];

-- Backfill nulls
UPDATE "SiteAnalytics" SET "riskReasons" = ARRAY[]::TEXT[] WHERE "riskReasons" IS NULL;
UPDATE "UserAnalytics" SET "riskReasons" = ARRAY[]::TEXT[] WHERE "riskReasons" IS NULL;
