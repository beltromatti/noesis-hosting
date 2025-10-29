import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { getSiteForUser, updatePrimaryDomain } from "@/lib/sites";

const schema = z.object({
  hostname: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9.-]+\.[a-z]{2,}$/i, "Invalid domain"),
});

export async function PATCH(
  request: Request,
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
    const payload = await request.json();
    const { hostname } = schema.parse(payload);
    const updated = await updatePrimaryDomain(site, hostname);
    return NextResponse.json({ site: updated });
  } catch (error) {
    console.error("Domain update failed", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
