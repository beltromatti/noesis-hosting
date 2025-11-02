import { Prisma, AuthEventType, UserAccessLog } from "@prisma/client";
import UAParser from "ua-parser-js";
import { ensureIpInsight, normalizeIp } from "./ipinfo";
import { prisma } from "./prisma";

const BOT_REGEX = /bot|crawl|spider|slurp|loader|fetcher|monitor|python-requests|curl|wget/i;

export type AccessEventInput = {
  userId?: string;
  email?: string;
  sessionId?: string;
  eventType: AuthEventType;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown>;
};

export type RecordedAccessEvent = {
  log: UserAccessLog;
};

export async function recordUserAccessEvent(input: AccessEventInput): Promise<RecordedAccessEvent> {
  const normalizedIp = normalizeIp(input.ipAddress);
  const ipInsight = await ensureIpInsight(normalizedIp);
  const ipAddress = ipInsight?.ipAddress ?? normalizedIp ?? null;

  const parser = input.userAgent ? new UAParser(input.userAgent) : null;
  const result = parser?.getResult();

  const browser = result?.browser;
  const os = result?.os;
  const device = result?.device;
  const engine = result?.engine;
  const cpu = result?.cpu;

  const isMobile = device?.type ? device.type === "mobile" || device.type === "tablet" : undefined;
  const isBot = input.userAgent ? BOT_REGEX.test(input.userAgent) : undefined;

  const geoLoc =
    ipInsight?.latitude !== undefined && ipInsight?.longitude !== undefined
      ? `${ipInsight.latitude},${ipInsight.longitude}`
      : undefined;

  const metadataEntries = input.metadata
    ? Object.entries(input.metadata).filter(([, value]) => value !== undefined)
    : [];
  const metadataValue =
    metadataEntries.length > 0
      ? (Object.fromEntries(metadataEntries) as Prisma.JsonObject)
      : undefined;

  const log = await prisma.userAccessLog.create({
    data: {
      userId: input.userId ?? undefined,
      email: input.email ?? undefined,
      sessionId: input.sessionId ?? undefined,
      eventType: input.eventType,
      ipAddress: ipAddress ?? undefined,
      userAgent: input.userAgent ?? undefined,
      clientBrowser: browser?.name ?? undefined,
      clientBrowserVersion: browser?.version ?? undefined,
      clientOs: os?.name ?? undefined,
      clientOsVersion: os?.version ?? undefined,
      clientDevice: device?.model ?? device?.type ?? undefined,
      clientPlatform: cpu?.architecture ?? undefined,
      clientEngine: engine?.name ?? undefined,
      isMobile,
      isBot,
      geoCity: ipInsight?.city ?? undefined,
      geoRegion: ipInsight?.region ?? undefined,
      geoCountry: ipInsight?.country ?? undefined,
      geoTimezone: ipInsight?.timezone ?? undefined,
      geoLoc,
      isp: ipInsight?.carrierName ?? undefined,
      org: ipInsight?.org ?? undefined,
      confidence: undefined,
      metadata: metadataValue,
    },
  });

  return { log };
}
