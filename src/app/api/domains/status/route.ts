import { NextResponse } from "next/server";
import { checkDomainARecord } from "@/lib/dns";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const hostname = searchParams.get("hostname");

  if (!hostname) {
    return NextResponse.json({ error: "hostname query parameter is required" }, { status: 400 });
  }

  const result = await checkDomainARecord(hostname.toLowerCase());
  return NextResponse.json({ result });
}
