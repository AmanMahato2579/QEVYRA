// QEVYRA outbound notifications — service (platform core).
// Product modules (Track, Order, Bookings) call `enqueueNotification` to record
// the message they WANT to send. This writes an audit row first (honest state:
// NOT_CONFIGURED when no provider is connected) and only then attempts delivery
// through the matching provider adapter. It never throws — a notification must
// never break the primary business action.
import { prisma } from "@/lib/prisma";
import { NotificationChannel, NotificationDeliveryStatus } from "@prisma/client";
import { getProvider, notificationChannelStatus, type ChannelStatus } from "./providers";

export interface EnqueueInput {
  channel: NotificationChannel;
  recipient: string;
  body: string;
  subject?: string | null;
  refType?: string | null;
  refId?: string | null;
}

export type NotificationEvent = Awaited<ReturnType<typeof prisma.notificationEvent.create>>;

export async function enqueueNotification(businessId: string, input: EnqueueInput) {
  const provider = getProvider(input.channel);
  const base = {
    businessId,
    channel: input.channel,
    recipient: input.recipient,
    subject: input.subject ?? null,
    body: input.body,
    provider: provider?.id ?? null,
    refType: input.refType ?? null,
    refId: input.refId ?? null,
  };

  try {
    if (!provider || !provider.isConfigured()) {
      return await prisma.notificationEvent.create({
        data: {
          ...base,
          status: NotificationDeliveryStatus.NOT_CONFIGURED,
          error: "No provider is connected for this channel.",
        },
      });
    }

    const event = await prisma.notificationEvent.create({
      data: { ...base, status: NotificationDeliveryStatus.PENDING },
    });

    const result = await provider.send({
      channel: input.channel,
      to: input.recipient,
      subject: input.subject,
      body: input.body,
    });

    return await prisma.notificationEvent.update({
      where: { id: event.id },
      data: {
        status: result.ok ? NotificationDeliveryStatus.SENT : NotificationDeliveryStatus.FAILED,
        attempts: { increment: 1 },
        sentAt: result.ok ? new Date() : null,
        error: result.ok ? null : result.error ?? "Send failed.",
      },
    });
  } catch (error) {
    console.error("[notifications] enqueue failed:", error);
    return null;
  }
}

export function listNotificationEvents(
  businessId: string,
  opts: { status?: NotificationDeliveryStatus; take?: number } = {}
) {
  return prisma.notificationEvent.findMany({
    where: { businessId, ...(opts.status ? { status: opts.status } : {}) },
    orderBy: { createdAt: "desc" },
    take: Math.min(opts.take ?? 50, 100),
  });
}

export function getNotificationEventCounts(businessId: string) {
  return prisma.notificationEvent.groupBy({
    by: ["status"],
    where: { businessId },
    _count: { _all: true },
  });
}

export { notificationChannelStatus };
export type { ChannelStatus };
