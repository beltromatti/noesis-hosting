import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { getSiteForUser, updateSecurityConfig } from "@/lib/sites";

const firewallSchema = z.object({
  enabled: z.boolean().optional(),
  geoBlock: z.array(z.string().length(2)).optional(),
});

const securitySchema = z.object({
  forceHttps: z.boolean().optional(),
  autoIndexing: z.boolean().optional(),
  accessLogging: z.boolean().optional(),
  basicAuth: z.boolean().optional(),
  firewall: firewallSchema.optional(),
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
    const parsed = securitySchema.parse(payload);
    const updated = await updateSecurityConfig(site.id, session.userId, parsed);
    return NextResponse.json({ site: updated });
  } catch (error) {
    console.error("Security update failed", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
