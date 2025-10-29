import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  siteId: z.string().cuid(),
  domain: z.string().min(3).max(120),
  tlds: z.array(z.string().regex(/^\./)).nonempty(),
  budgetUsd: z.number().int().positive().max(5000).optional(),
  notes: z.string().max(500).optional(),
});

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = schema.parse(await request.json());
    const site = await prisma.site.findFirst({
      where: { id: payload.siteId, userId: session.userId },
    });

    if (!site) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    const requestRecord = await prisma.domainPurchaseRequest.create({
      data: {
        siteId: site.id,
        domain: payload.domain.toLowerCase(),
        tlds: payload.tlds.map((tld) => tld.toLowerCase()),
        budgetUsd: payload.budgetUsd,
        notes: payload.notes,
      },
    });

    return NextResponse.json({ request: requestRecord }, { status: 201 });
  } catch (error) {
    console.error("Domain request failed", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
