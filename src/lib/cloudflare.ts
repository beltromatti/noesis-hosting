import { CLOUDFLARE_API_KEY, CLOUDFLARE_EMAIL, EDGE_IP, ZONE_NAME } from "./env";

const CLOUDFLARE_BASE_URL = "https://api.cloudflare.com/client/v4";

let cachedZoneId: string | null = null;

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

  const json = await response.json();
  if (!response.ok || !json.success) {
    const errors = Array.isArray(json.errors) ? json.errors : [];
    const message = errors.length > 0
      ? errors
          .map((err: Record<string, unknown>) => {
            const msg = typeof err.message === "string" ? err.message : undefined;
            return msg ?? JSON.stringify(err);
          })
          .join(", ")
      : json.message ?? "Cloudflare API request failed";
    throw new Error(message);
  }

  return json.result as T;
}

async function getZoneId(): Promise<string> {
  if (cachedZoneId) {
    return cachedZoneId;
  }

  const result = await cfRequest<{ id: string }[]>(`/zones?name=${encodeURIComponent(ZONE_NAME)}`);
  if (!Array.isArray(result) || result.length === 0) {
    throw new Error(`Unable to resolve Cloudflare zone ID for ${ZONE_NAME}`);
  }
  cachedZoneId = result[0].id;
  return cachedZoneId;
}

async function findExistingRecord(zoneId: string, hostname: string) {
  const records = await cfRequest<Array<{ id: string; content: string; proxied: boolean }>>(
    `/zones/${zoneId}/dns_records?type=A&name=${encodeURIComponent(hostname)}`,
  );
  return records?.[0] ?? null;
}

export async function ensureSandboxDnsRecord(hostname: string) {
  const zoneId = await getZoneId();
  const existing = await findExistingRecord(zoneId, hostname);
  const payload = {
    type: "A",
    name: hostname,
    content: EDGE_IP,
    ttl: 300,
    proxied: true,
  };

  if (existing) {
    if (existing.content === EDGE_IP && existing.proxied) {
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
