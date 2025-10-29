import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { createSiteForUser, listSitesForUser } from "@/lib/sites";

const createSiteSchema = z.object({
  name: z.string().min(2).max(80),
  customDomain: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9.-]+\.[a-z]{2,}$/i, "Invalid domain")
    .optional()
    .or(z.literal("")),
  requestDomainPurchase: z.boolean().optional(),
});

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const sites = await listSitesForUser(session.userId);
  return NextResponse.json({ sites });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = await request.json();
    const parsed = createSiteSchema.parse(payload);
    const site = await createSiteForUser(session.userId, {
      name: parsed.name,
      customDomain: parsed.customDomain || undefined,
      requestDomainPurchase: parsed.requestDomainPurchase,
    });
    return NextResponse.json({ site }, { status: 201 });
  } catch (error) {
    console.error("Create site failed", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
