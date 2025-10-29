import { CLOUDFLARE_API_KEY, CLOUDFLARE_EMAIL, EDGE_IP, ZONE_NAME } from "./env";

const CLOUDFLARE_BASE_URL = "https://api.cloudflare.com/client/v4";

let cachedZoneId: string | null = null;

type CfError = { code?: number; message?: string };
type CfResponse<T> = { result: T; success: boolean; errors: CfError[]; messages: unknown[] };
type CfZone = { id: string };
type CfDnsRecord = { id: string; name: string; content: string; proxied: boolean; type: string };

function cfHeaders() {
  return {
    "Content-Type": "application/json",
    "X-Auth-Email": CLOUDFLARE_EMAIL,
    "X-Auth-Key": CLOUDFLARE_API_KEY,
  };
}

async function cfRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${CLOUDFLARE_BASE_URL}${path}`, {
    ...init,
    headers: {
      ...cfHeaders(),
      ...(init?.headers ?? {}),
    },
  });

  const json = (await response.json()) as CfResponse<T>;
  if (!response.ok || !json.success) {
    const errors = Array.isArray(json.errors) ? json.errors : [];
    const message = errors.length > 0
      ? errors
          .map((err) => (err.message ? err.message : JSON.stringify(err)))
          .join(", ")
      : "Cloudflare API request failed";
    throw new Error(message);
  }

  return json.result as T;
}

async function getZoneId(): Promise<string> {
  if (cachedZoneId) {
    return cachedZoneId;
  }

  const result = await cfRequest<CfZone[]>(`/zones?name=${encodeURIComponent(ZONE_NAME)}`);
  if (!Array.isArray(result) || result.length === 0) {
    throw new Error(`Unable to resolve Cloudflare zone ID for ${ZONE_NAME}`);
  }
  cachedZoneId = result[0].id;
  return cachedZoneId;
}

async function findExistingRecord(zoneId: string, hostname: string, type: "A" | "TXT") {
  const records = await cfRequest<CfDnsRecord[]>(
    `/zones/${zoneId}/dns_records?type=${type}&name=${encodeURIComponent(hostname)}`,
  );
  return records?.[0] ?? null;
}

async function listTxtRecords(zoneId: string, hostname: string) {
  return cfRequest<CfDnsRecord[]>(
    `/zones/${zoneId}/dns_records?type=TXT&name=${encodeURIComponent(hostname)}&per_page=100`,
  );
}

export async function ensureSandboxDnsRecord(hostname: string) {
  const zoneId = await getZoneId();
  const existing = await findExistingRecord(zoneId, hostname, "A");
  const payload = {
    type: "A",
    name: hostname,
    content: EDGE_IP,
    ttl: 300,
    proxied: false,
  };

  if (existing) {
    if (existing.content === EDGE_IP && !existing.proxied) {
      return;
    }
    await cfRequest(`/zones/${zoneId}/dns_records/${existing.id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  } else {
    await cfRequest(`/zones/${zoneId}/dns_records`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }
}

export async function deleteSandboxDnsRecord(hostname: string) {
  const zoneId = await getZoneId();
  const existing = await findExistingRecord(zoneId, hostname, "A");
  if (!existing) {
    return;
  }
  await cfRequest(`/zones/${zoneId}/dns_records/${existing.id}`, {
    method: "DELETE",
  });
}

export async function createTxtRecord(hostname: string, content: string) {
  const zoneId = await getZoneId();
  const payload = {
    type: "TXT",
    name: hostname,
    content,
    ttl: 120,
  };
  const record = await cfRequest<CfDnsRecord>(`/zones/${zoneId}/dns_records`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return record.id;
}

export async function deleteTxtRecord(recordId: string) {
  const zoneId = await getZoneId();
  await cfRequest(`/zones/${zoneId}/dns_records/${recordId}`, {
    method: "DELETE",
  });
}

export async function deleteTxtRecordsByName(hostname: string) {
  const zoneId = await getZoneId();
  const records = await listTxtRecords(zoneId, hostname);
  await Promise.all(
    records.map((record) =>
      cfRequest(`/zones/${zoneId}/dns_records/${record.id}`, {
        method: "DELETE",
      }).catch(() => undefined),
    ),
  );
}
