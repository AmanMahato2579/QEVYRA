import { apiGuard } from "@/lib/api-guard";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";
import { updateBookingStatus } from "@/lib/db";
import { enqueueNotification } from "@/modules/notifications/services";
import { NotificationChannel } from "@prisma/client";

const statusSchema = z.object({
  status: z.enum(["ACCEPTED", "REJECTED", "CANCELLED", "COMPLETED"]),
});

const STATUS_MESSAGE: Record<string, string> = {
  ACCEPTED: "has been confirmed",
  REJECTED: "could not be accepted",
  CANCELLED: "has been cancelled",
  COMPLETED: "is complete",
};

function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await apiGuard({ permission: "bookings.manage" });
  if (guard.error) return guard.error;
  const restaurantId = guard.user.restaurantId;
  if (!restaurantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const body = await req.json();
  const parsed = statusSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid status" }, { status: 400 });

  const result = await updateBookingStatus(id, restaurantId, parsed.data.status);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 404 });

  // Best-effort customer notice (honest NOT_CONFIGURED when no provider is set).
  const booking = await prisma.booking.findFirst({
    where: { id, restaurantId },
    select: {
      contactPhone: true,
      bookingDate: true,
      startMinutes: true,
      service: { select: { name: true } },
      restaurant: { select: { businessId: true, name: true } },
    },
  });
  const businessId = booking?.restaurant?.businessId;
  if (booking?.contactPhone && businessId) {
    await enqueueNotification(businessId, {
      channel: NotificationChannel.WHATSAPP,
      recipient: booking.contactPhone,
      body: `Your ${booking.service?.name ?? "booking"} on ${booking.bookingDate} at ${formatTime(booking.startMinutes)} ${STATUS_MESSAGE[parsed.data.status] ?? "was updated"}.`,
      refType: "booking",
      refId: id,
    });
  }

  return NextResponse.json({ success: true });
}
