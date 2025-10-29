import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { deleteSiteForUser } from "@/lib/sites";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ siteId: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { siteId } = await context.params;
  try {
    await deleteSiteForUser(siteId, session.userId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Delete site failed", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
