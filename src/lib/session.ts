import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "./prisma";

export const SESSION_COOKIE = "noesis_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

export type SessionRecord = {
  token: string;
  expiresAt: Date;
};

export async function createSession(userId: string): Promise<SessionRecord> {
  const token = randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await prisma.session.create({
    data: {
      userId,
      token,
      expiresAt,
    },
  });

  return { token, expiresAt };
}

export function attachSessionCookie(response: NextResponse, session: SessionRecord) {
  response.cookies.set(SESSION_COOKIE, session.token, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: session.expiresAt,
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, "", {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: new Date(0),
  });
}

export async function destroySession(token?: string) {
  const resolvedToken = token ?? (await cookies()).get(SESSION_COOKIE)?.value;
  if (!resolvedToken) return;
  await prisma.session.deleteMany({ where: { token: resolvedToken } });
}

export async function getSession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!session || session.expiresAt.getTime() < Date.now()) {
    await destroySession(token);
    return null;
  }

  return session;
}
