import { Resolver } from "dns/promises";
import { EDGE_IP } from "./env";

const resolver = new Resolver();

const CLOUDFLARE_IPV4_RANGES: readonly string[] = [
  "173.245.48.0/20",
  "103.21.244.0/22",
  "103.22.200.0/22",
  "103.31.4.0/22",
  "141.101.64.0/18",
  "108.162.192.0/18",
  "190.93.240.0/20",
  "188.114.96.0/20",
  "197.234.240.0/22",
  "198.41.128.0/17",
  "162.158.0.0/15",
  "104.16.0.0/13",
  "131.0.72.0/22",
];

function ipToLong(ip: string): number | null {
  const octets = ip.split(".").map((part) => Number(part));
  if (octets.length !== 4 || octets.some((value) => Number.isNaN(value) || value < 0 || value > 255)) {
    return null;
  }
  return ((((octets[0] << 24) >>> 0) + ((octets[1] << 16) >>> 0) + ((octets[2] << 8) >>> 0) + (octets[3] >>> 0)) >>> 0);
}

function maskFromBits(bits: number): number {
  if (bits === 0) {
    return 0;
  }
  return (0xffffffff << (32 - bits)) >>> 0;
}

function cidrContains(cidr: string, ip: string): boolean {
  const [range, bitsStr] = cidr.split("/");
  const bits = Number(bitsStr);
  if (!range || Number.isNaN(bits) || bits < 0 || bits > 32) {
    return false;
  }
  const rangeLong = ipToLong(range);
  const ipLong = ipToLong(ip);
  if (rangeLong === null || ipLong === null) {
    return false;
  }
  if (bits === 0) {
    return true;
  }
  const mask = maskFromBits(bits);
  return ((rangeLong & mask) >>> 0) === ((ipLong & mask) >>> 0);
}

function isCloudflareIp(ip: string) {
  return CLOUDFLARE_IPV4_RANGES.some((cidr) => cidrContains(cidr, ip));
}

export type DnsCheckStatus = "MATCH" | "PROXIED" | "MISMATCH" | "UNRESOLVED";

export type DnsCheckResult = {
  hostname: string;
  records: string[];
  expected: string;
  status: DnsCheckStatus;
  message?: string;
  proxied?: boolean;
};

export async function checkDomainARecord(hostname: string): Promise<DnsCheckResult> {
  try {
    const records = await resolver.resolve4(hostname);
    const dedupedRecords = Array.from(new Set(records));
    const matchesEdge = dedupedRecords.includes(EDGE_IP);
    const matchesProxy = !matchesEdge && dedupedRecords.some((record) => isCloudflareIp(record));

    let status: DnsCheckStatus = "MISMATCH";
    let message: string | undefined;
    let proxied = false;

    if (matchesEdge) {
      status = "MATCH";
    } else if (matchesProxy) {
      status = "PROXIED";
      proxied = true;
      message = "Domain is proxied via Cloudflare (orange-cloud).";
    } else {
      message = "DNS is live but does not point to the Noesis edge yet.";
    }

    return {
      hostname,
      records: dedupedRecords,
      expected: EDGE_IP,
      status,
      message,
      proxied,
    };
  } catch (error) {
    return {
      hostname,
      records: [],
      expected: EDGE_IP,
      status: "UNRESOLVED",
      message: (error as Error).message,
    };
  }
}
