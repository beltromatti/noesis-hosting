import { Prisma, UsageEventType } from "@prisma/client";
import { prisma } from "./prisma";

export type UsageEventPayload = {
  eventType: UsageEventType;
  userId?: string;
  siteId?: string;
  metadata?: Prisma.InputJsonValue;
};

export async function recordUsageEvent(payload: UsageEventPayload) {
  try {
    await prisma.usageEvent.create({
      data: {
        eventType: payload.eventType,
        userId: payload.userId,
        siteId: payload.siteId,
        metadata: payload.metadata,
      },
    });
  } catch (error) {
    console.error("Failed to record usage event", error);
  }
}

export async function recordUsageEvents(payloads: UsageEventPayload[]) {
  if (payloads.length === 0) return;
  try {
    await prisma.$transaction(
      payloads.map((payload) =>
        prisma.usageEvent.create({
          data: {
            eventType: payload.eventType,
            userId: payload.userId,
            siteId: payload.siteId,
            metadata: payload.metadata,
          },
        }),
      ),
    );
  } catch (error) {
    console.error("Failed to record usage events", error);
  }
}
