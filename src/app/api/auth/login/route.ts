import { NextResponse } from "next/server";
import { UsageEventType } from "@prisma/client";
import { authenticateUser } from "@/lib/auth";
import { attachSessionCookie } from "@/lib/session";
import { recordUsageEvent } from "@/lib/usage";
import { noteFailedLogin, noteUserLogin } from "@/lib/analytics";
import { getRequestFingerprint } from "@/lib/request-metadata";

export async function POST(request: Request) {
  const fingerprint = getRequestFingerprint(request);
  const payload = await request.json().catch(() => null);
  try {
    if (!payload) {
      throw new Error("Invalid request payload");
    }
    const { user, session } = await authenticateUser(payload);
    const response = NextResponse.json({ user }, { status: 200 });
    attachSessionCookie(response, session);
    void noteUserLogin(user.id, {
      ip: fingerprint.ip,
      userAgent: fingerprint.userAgent,
      sessionId: session.id,
      metadata: {
        referer: fingerprint.referer ?? undefined,
        acceptLanguage: fingerprint.acceptLanguage ?? undefined,
      },
    });
    return response;
  } catch (error) {
    console.error("Login failed", error);
    const email = typeof payload?.email === "string" ? payload.email.toLowerCase() : undefined;
    if (email) {
      void noteFailedLogin(email, {
        ip: fingerprint.ip,
        userAgent: fingerprint.userAgent,
        metadata: {
          referer: fingerprint.referer ?? undefined,
          acceptLanguage: fingerprint.acceptLanguage ?? undefined,
        },
      });
    }
    void recordUsageEvent({
      eventType: UsageEventType.USER_LOGIN_FAILED,
      metadata: email ? { email } : undefined,
    });
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
