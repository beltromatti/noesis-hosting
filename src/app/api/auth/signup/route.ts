import { NextResponse } from "next/server";
import { registerUser } from "@/lib/auth";
import { attachSessionCookie } from "@/lib/session";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const { user, session } = await registerUser(payload);
    const response = NextResponse.json({ user }, { status: 201 });
    attachSessionCookie(response, session);
    return response;
  } catch (error) {
    console.error("Signup failed", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
