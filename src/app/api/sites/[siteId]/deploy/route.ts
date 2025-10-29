import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getSiteForUser, refreshNginxForSite } from "@/lib/sites";
import { ensureDeploymentHasIndex, extractArchive, persistArchiveTemp, scanArchive } from "@/lib/uploads";

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

    const tmpPath = await persistArchiveTemp(file);
    const scanResult = await scanArchive(tmpPath);
    if (!scanResult.ok) {
      await fs.rm(tmpPath, { force: true });
      return NextResponse.json({ error: scanResult.message ?? "Malware detected" }, { status: 400 });
    }

    await extractArchive(tmpPath, site.storagePath);
    await ensureDeploymentHasIndex(site.storagePath);
    await fs.rm(tmpPath, { force: true });

    await prisma.$transaction(async (tx) => {
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
        },
      });
    });

    const freshSite = await getSiteForUser(site.id, session.userId);
    if (freshSite) {
      await refreshNginxForSite(freshSite);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Deployment failed", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
