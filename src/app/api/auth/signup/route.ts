import { NextResponse } from "next/server";
import { registerUser } from "@/lib/auth";
import { attachSessionCookie } from "@/lib/session";
import { getRequestFingerprint } from "@/lib/request-metadata";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const fingerprint = getRequestFingerprint(request);
    const { user, session } = await registerUser(payload, {
      ip: fingerprint.ip,
      userAgent: fingerprint.userAgent,
      metadata: {
        referer: fingerprint.referer ?? undefined,
        acceptLanguage: fingerprint.acceptLanguage ?? undefined,
      },
    });
    const response = NextResponse.json({ user }, { status: 201 });
    attachSessionCookie(response, session);
    return response;
  } catch (error) {
    console.error("Signup failed", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
