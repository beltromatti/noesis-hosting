import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { logoutUser } from "@/lib/auth";
import { clearSessionCookie, SESSION_COOKIE } from "@/lib/session";

export async function POST() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  await logoutUser(token ?? undefined);
  const response = NextResponse.json({ ok: true });
  clearSessionCookie(response);
  return response;
}
