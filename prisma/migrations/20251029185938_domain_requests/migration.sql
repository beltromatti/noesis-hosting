-- CreateEnum
CREATE TYPE "DomainPurchaseStatus" AS ENUM ('PENDING', 'IN_REVIEW', 'SUBMITTED', 'COMPLETED', 'REJECTED');

-- CreateTable
CREATE TABLE "DomainPurchaseRequest" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "tlds" TEXT[],
    "status" "DomainPurchaseStatus" NOT NULL DEFAULT 'PENDING',
    "budgetUsd" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DomainPurchaseRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DomainPurchaseRequest_siteId_status_idx" ON "DomainPurchaseRequest"("siteId", "status");

-- AddForeignKey
ALTER TABLE "DomainPurchaseRequest" ADD CONSTRAINT "DomainPurchaseRequest_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;
