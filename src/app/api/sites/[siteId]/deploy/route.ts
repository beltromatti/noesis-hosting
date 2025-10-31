import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import { SecurityScanStatus, SiteRuntime, SiteStatus, UsageEventType } from "@prisma/client";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { analyzeDeploymentTree, getSiteForUser, refreshNginxForSite } from "@/lib/sites";
import { extractArchive, persistArchiveTemp, scanArchive, scanPath } from "@/lib/uploads";
import { noteDeploymentResult, noteSiteStatusChange } from "@/lib/analytics";
import { recordUsageEvent } from "@/lib/usage";
import { env } from "@/lib/env";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ siteId: string }> }
) {
  const { siteId } = await context.params;
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const site = await getSiteForUser(siteId, session.userId);
  if (!site) {
    return NextResponse.json({ error: "Site not found" }, { status: 404 });
  }

  let archiveBytes = 0;
  let malwareScanPassed = false;
  let deploymentLogged = false;
  let deploymentRuntime: SiteRuntime = site.runtime as SiteRuntime;
  let scanStatus: SecurityScanStatus = SecurityScanStatus.UNKNOWN;
  let scanNotes: string | undefined;

  try {
    const formData = await request.formData();
    const file = formData.get("archive");
    const notes = typeof formData.get("notes") === "string" ? (formData.get("notes") as string) : undefined;

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Archive file is required" }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith(".zip")) {
      return NextResponse.json({ error: "Only .zip archives are supported" }, { status: 400 });
    }

    archiveBytes = typeof file.size === "number" ? file.size : 0;
    const tmpPath = await persistArchiveTemp(file);
    const scanResult = await scanArchive(tmpPath);
    if (!scanResult.ok) {
      await fs.rm(tmpPath, { force: true });
      await prisma.siteSecurityProfile.update({
        where: { siteId: site.id },
        data: {
          lastScanAt: new Date(),
          lastScanStatus: SecurityScanStatus.FAIL,
          lastScanNotes: scanResult.message ?? "Archive flagged by antivirus",
        },
      }).catch(() => undefined);
      await noteDeploymentResult({
        siteId: site.id,
        userId: session.userId,
        bytesUploaded: archiveBytes,
        success: false,
        malwareScanPassed: false,
        runtime: deploymentRuntime,
      });
      void recordUsageEvent({
        eventType: UsageEventType.SITE_DEPLOYMENT_FAILED,
        siteId: site.id,
        userId: session.userId,
        metadata: {
          reason: scanResult.message ?? "Malware detected",
        },
      });
      return NextResponse.json({ error: scanResult.message ?? "Malware detected" }, { status: 400 });
    }
    malwareScanPassed = true;

    await extractArchive(tmpPath, site.storagePath);
    const analysis = await analyzeDeploymentTree(site.storagePath);
    if (!analysis.entryPoint) {
      throw new Error("Deployment must include an index.html or index.php entry point at the root.");
    }

    deploymentRuntime = analysis.entryPoint === "index.php" ? SiteRuntime.PHP : SiteRuntime.STATIC;

    const storageLimitMb = site.securityProfile?.storageLimitMb ?? env.MAX_ARCHIVE_SIZE_MB;
    const storageLimitBytes = storageLimitMb * 1024 * 1024;
    if (analysis.totalBytes > storageLimitBytes) {
      throw new Error(
        `Deployment expands to ${(analysis.totalBytes / (1024 * 1024)).toFixed(1)}MB which exceeds the allocated ${storageLimitMb}MB budget.`,
      );
    }

    const contentScan = await scanPath(site.storagePath);
    if (!contentScan.ok) {
      await prisma.siteSecurityProfile.update({
        where: { siteId: site.id },
        data: {
          runtime: deploymentRuntime,
          lastScanAt: new Date(),
          lastScanStatus: SecurityScanStatus.FAIL,
          lastScanNotes: contentScan.message ?? "Extracted payload flagged by antivirus",
        },
      }).catch(() => undefined);
      throw new Error(contentScan.message ?? "Malware detected in extracted archive.");
    }
    scanStatus = SecurityScanStatus.PASS;
    if (analysis.phpDetected && deploymentRuntime === SiteRuntime.STATIC) {
      scanStatus = SecurityScanStatus.WARN;
      scanNotes = "PHP assets detected but runtime remains static. Execution is blocked.";
    } else {
      scanNotes = undefined;
    }

    await fs.rm(tmpPath, { force: true });

    await prisma.$transaction(async (tx) => {
      await tx.deployment.updateMany({
        where: { siteId: site.id, status: "ACTIVE" },
        data: { status: "ROLLED_BACK" },
      });
      await tx.deployment.create({
        data: {
          siteId: site.id,
          status: "ACTIVE",
          notes,
          completedAt: new Date(),
        },
      });

      await tx.site.update({
        where: { id: site.id },
        data: {
          status: "ACTIVE",
          lastDeploymentAt: new Date(),
          runtime: deploymentRuntime,
        },
      });

      await tx.siteSecurityProfile.upsert({
        where: { siteId: site.id },
        create: {
          siteId: site.id,
          runtime: deploymentRuntime,
          lastScanAt: new Date(),
          lastScanStatus: scanStatus,
          lastScanNotes: scanNotes ?? null,
        },
        update: {
          runtime: deploymentRuntime,
          lastScanAt: new Date(),
          lastScanStatus: scanStatus,
          lastScanNotes: scanNotes ?? null,
        },
      });
    });

    const freshSite = await getSiteForUser(site.id, session.userId);
    if (freshSite) {
      await refreshNginxForSite(freshSite as Parameters<typeof refreshNginxForSite>[0]);
    }
    await noteDeploymentResult({
      siteId: site.id,
      userId: session.userId,
      bytesUploaded: archiveBytes,
      success: true,
      malwareScanPassed,
      runtime: deploymentRuntime,
    });
    deploymentLogged = true;
    if (site.status !== SiteStatus.ACTIVE) {
      await noteSiteStatusChange({
        siteId: site.id,
        userId: session.userId,
        nextStatus: SiteStatus.ACTIVE,
      });
    }
    void recordUsageEvent({
      eventType: UsageEventType.SITE_DEPLOYED,
      siteId: site.id,
      userId: session.userId,
      metadata: {
        bytesUploaded: archiveBytes,
        runtime: deploymentRuntime,
        scanStatus,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Deployment failed", error);
    if (!deploymentLogged) {
      await noteDeploymentResult({
        siteId: site.id,
        userId: session.userId,
        bytesUploaded: archiveBytes,
        success: false,
        malwareScanPassed,
        runtime: deploymentRuntime,
      });
      void recordUsageEvent({
        eventType: UsageEventType.SITE_DEPLOYMENT_FAILED,
        siteId: site.id,
        userId: session.userId,
        metadata: {
          message: (error as Error).message,
          bytesUploaded: archiveBytes,
        },
      });
    }
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
