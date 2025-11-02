import { normalizeIp } from "./ipinfo";

const IP_HEADER_CANDIDATES = [
  "cf-connecting-ip",
  "true-client-ip",
  "x-client-ip",
  "x-real-ip",
  "x-forwarded-for",
  "forwarded",
];

function extractFromForwarded(headerValue: string): string | null {
  const forwardedPairs = headerValue.split(";");
  for (const pair of forwardedPairs) {
    const [key, value] = pair.split("=");
    if (key.trim().toLowerCase() === "for" && value) {
      const normalized = value.replace(/"/g, "").trim();
      const ipv6Match = /^\[(.+)\](:\d+)?$/.exec(normalized);
      const candidate = ipv6Match ? ipv6Match[1] : normalized.split(":")[0];
      const ip = normalizeIp(candidate);
      if (ip) {
        return ip;
      }
    }
  }
  return null;
}

export function resolveClientIp(headers: Headers): string | null {
  for (const headerName of IP_HEADER_CANDIDATES) {
    const value = headers.get(headerName);
    if (!value) continue;
    if (headerName === "forwarded") {
      const ipFromForwarded = extractFromForwarded(value);
      if (ipFromForwarded) {
        return ipFromForwarded;
      }
      continue;
    }

    const ip = normalizeIp(value);
    if (ip) {
      return ip;
    }
  }
  return null;
}

export function getRequestFingerprint(request: Request) {
  const headers = request.headers;
  const ip = resolveClientIp(headers);
  const userAgent = headers.get("user-agent");
  const referer = headers.get("referer");
  const acceptLanguage = headers.get("accept-language");
  return {
    ip,
    userAgent,
    referer: referer ?? null,
    acceptLanguage: acceptLanguage ?? null,
  };
}
