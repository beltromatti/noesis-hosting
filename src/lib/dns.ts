import { Resolver } from "dns/promises";
import { EDGE_IP } from "./env";

const resolver = new Resolver();

export type DnsCheckStatus = "MATCH" | "MISMATCH" | "UNRESOLVED";

export type DnsCheckResult = {
  hostname: string;
  records: string[];
  expected: string;
  status: DnsCheckStatus;
  message?: string;
};

export async function checkDomainARecord(hostname: string): Promise<DnsCheckResult> {
  try {
    const records = await resolver.resolve4(hostname);
    const matchesEdge = records.includes(EDGE_IP);
    return {
      hostname,
      records,
      expected: EDGE_IP,
      status: matchesEdge ? "MATCH" : "MISMATCH",
      message: matchesEdge ? undefined : "DNS is live but does not point to the Noesis edge yet.",
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
