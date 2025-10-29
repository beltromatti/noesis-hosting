import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getSiteForUser } from "@/lib/sites";
import { env } from "@/lib/env";
import { zipDirectory } from "@/lib/deployments";
import { streamFileAsResponse } from "@/lib/files";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ siteId: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { siteId } = await context.params;
  const site = await getSiteForUser(siteId, session.userId);
  if (!site) {
    return NextResponse.json({ error: "Site not found" }, { status: 404 });
  }

  try {
    const archivePath = path.join(env.PLATFORM_UPLOAD_TMP, `${site.slug}-current.zip`);
    await zipDirectory(site.storagePath, archivePath);
    const response = await streamFileAsResponse(archivePath, `${site.slug}.zip`);
    setTimeout(() => {
      fs.rm(archivePath, { force: true }).catch(() => undefined);
    }, 60_000).unref();
    return response;
  } catch (error) {
    console.error("Failed to prepare archive", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
