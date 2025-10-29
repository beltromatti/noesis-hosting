import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { getSiteForUser, pauseSiteForUser, resumeSiteForUser } from "@/lib/sites";

const payloadSchema = z.object({
  action: z.enum(["pause", "resume"]),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ siteId: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { action } = payloadSchema.parse(await request.json());
  const { siteId } = await context.params;

  try {
    const site = await getSiteForUser(siteId, session.userId);
    if (!site) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    const updated =
      action === "pause"
        ? await pauseSiteForUser(siteId, session.userId)
        : await resumeSiteForUser(siteId, session.userId);

    return NextResponse.json({ site: updated });
  } catch (error) {
    console.error("Status toggle failed", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
