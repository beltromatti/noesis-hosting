import { NextResponse } from "next/server";
import { UsageEventType } from "@prisma/client";
import { authenticateUser } from "@/lib/auth";
import { attachSessionCookie } from "@/lib/session";
import { recordUsageEvent } from "@/lib/usage";
import { noteFailedLogin, noteUserLogin } from "@/lib/analytics";

export async function POST(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const ipCandidate = forwardedFor?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip") ?? null;
  const payload = await request.json().catch(() => null);
  try {
    if (!payload) {
      throw new Error("Invalid request payload");
    }
    const { user, session } = await authenticateUser(payload);
    const response = NextResponse.json({ user }, { status: 200 });
    attachSessionCookie(response, session);
    void noteUserLogin(user.id, ipCandidate);
    return response;
  } catch (error) {
    console.error("Login failed", error);
    const email = typeof payload?.email === "string" ? payload.email.toLowerCase() : undefined;
    if (email) {
      void noteFailedLogin(email, ipCandidate);
    }
    void recordUsageEvent({
      eventType: UsageEventType.USER_LOGIN_FAILED,
      metadata: email ? { email } : undefined,
    });
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
