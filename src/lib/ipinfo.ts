import { isIP } from "node:net";
import { Prisma } from "@prisma/client";
import { IPINFO_CACHE_TTL_MS, IPINFO_TOKEN } from "./env";
import { prisma } from "./prisma";

const PRIVATE_IPV4 = [/^10\./, /^192\.168\./, /^172\.(1[6-9]|2[0-9]|3[0-1])\./, /^127\./];
const LOOPBACK_IPV6 = /^::1$/;
const UNIQUE_LOCAL_IPV6 = /^fc|^fd/i;
const LINK_LOCAL_IPV6 = /^fe80/i;
const ABORT_TIMEOUT_MS = 4000;

type IpInfoResponse = {
  ip?: string;
  city?: string;
  region?: string;
  country?: string;
  loc?: string;
  timezone?: string;
  postal?: string;
  org?: string;
  hostname?: string;
  bogon?: boolean;
  readme?: string;
  asn?: {
    asn?: string;
    name?: string;
    domain?: string;
    type?: string;
  };
  company?: {
    name?: string;
    domain?: string;
    type?: string;
  };
  carrier?: {
    name?: string;
    mcc?: string;
    mnc?: string;
  };
  privacy?: {
    vpn?: boolean;
    proxy?: boolean;
    tor?: boolean;
    hosting?: boolean;
    service?: string;
  };
  abuse?: {
    address?: string;
    country?: string;
    email?: string;
    name?: string;
    network?: string;
    phone?: string;
  };
  [key: string]: unknown;
};

export function normalizeIp(ip?: string | null): string | null {
  if (!ip) return null;
  const first = ip.split(",")[0]?.trim();
  if (!first) return null;
  const withoutPrefix = first.startsWith("::ffff:") ? first.slice(7) : first;
  return isIP(withoutPrefix) ? withoutPrefix : null;
}

export function isPrivateIp(ip: string): boolean {
  if (isIP(ip) === 6) {
    return LOOPBACK_IPV6.test(ip) || UNIQUE_LOCAL_IPV6.test(ip) || LINK_LOCAL_IPV6.test(ip);
  }

  return PRIVATE_IPV4.some((pattern) => pattern.test(ip));
}

function computeExpiry(isBogon: boolean): Date {
  const ttl = isBogon ? 7 * 24 * 60 * 60 * 1000 : IPINFO_CACHE_TTL_MS;
  return new Date(Date.now() + ttl);
}

export async function ensureIpInsight(ip?: string | null) {
  const normalized = normalizeIp(ip);
  if (!normalized) return null;

  const existing = await prisma.ipAddressInsight.findUnique({ where: { ipAddress: normalized } });
  if (existing && (!existing.expiresAt || existing.expiresAt.getTime() > Date.now())) {
    return existing;
  }

  const shouldLookup = !isPrivateIp(normalized);

  let payload: Partial<IpInfoResponse> | null = null;

  if (shouldLookup) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), ABORT_TIMEOUT_MS);
      try {
        const url = new URL(`https://ipinfo.io/${encodeURIComponent(normalized)}/json`);
        if (IPINFO_TOKEN) {
          url.searchParams.set("token", IPINFO_TOKEN);
        }

        const response = await fetch(url, {
          signal: controller.signal,
          headers: { Accept: "application/json" },
        });

        if (response.ok) {
          payload = (await response.json()) as IpInfoResponse;
        } else {
          console.warn("ipinfo lookup failed", normalized, response.status);
        }
      } finally {
        clearTimeout(timeout);
      }
    } catch (error) {
      console.warn("ipinfo lookup error", normalized, error);
    }
  }

  const locString = typeof payload?.loc === "string" ? payload.loc : undefined;
  let latitude: number | undefined;
  let longitude: number | undefined;

  if (locString) {
    const [latRaw, lonRaw] = locString.split(",");
    const lat = Number.parseFloat(latRaw);
    const lon = Number.parseFloat(lonRaw);
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      latitude = lat;
      longitude = lon;
    }
  }

  const asnInfo = payload?.asn;
  let asn: string | undefined = asnInfo?.asn;
  let asnName: string | undefined = asnInfo?.name;
  const asnDomain: string | undefined = asnInfo?.domain;
  const asnType: string | undefined = asnInfo?.type;

  if (!asn && typeof payload?.org === "string") {
    const match = /^AS(\d+)\s+(.+)$/.exec(payload.org);
    if (match) {
      asn = `AS${match[1]}`;
      asnName = match[2];
    }
  }

  const isBogon = Boolean(payload?.bogon) || !shouldLookup;
  const expiresAt = computeExpiry(isBogon);
  const now = new Date();

  const data: Prisma.IpAddressInsightCreateInput = {
    ipAddress: normalized,
    city: payload?.city,
    region: payload?.region,
    country: payload?.country,
    latitude,
    longitude,
    timezone: payload?.timezone,
    postal: payload?.postal,
    org: payload?.org,
    asn,
    asnName,
    asnDomain,
    asnType,
    carrierName: payload?.carrier?.name,
    carrierMcc: payload?.carrier?.mcc,
    carrierMnc: payload?.carrier?.mnc,
    host: payload?.hostname,
    threatLevel: payload?.privacy?.service,
    proxyType: payload?.privacy?.hosting ? "hosting" : undefined,
    isBogon,
    raw: payload ? (payload as Prisma.InputJsonValue) : undefined,
    fetchedAt: now,
    expiresAt,
  };

  const record = await prisma.ipAddressInsight.upsert({
    where: { ipAddress: normalized },
    update: {
      ...data,
      fetchedAt: now,
      expiresAt,
    },
    create: data,
  });

  return record;
}
