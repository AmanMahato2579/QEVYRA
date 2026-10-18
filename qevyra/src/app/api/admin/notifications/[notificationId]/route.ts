import { prisma } from "@/lib/prisma";
import { apiGuard } from "@/lib/api-guard";
import { NextResponse } from "next/server";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ notificationId: string }> }
) {
  const guard = await apiGuard({ permission: "notifications.manage" });
  if (guard.error) return guard.error;
  const restaurantId = guard.user.restaurantId;
  if (!restaurantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { notificationId } = await params;

  const updated = await prisma.notification.updateMany({
    where: { id: notificationId, restaurantId },
    data: { read: true },
  });

  if (updated.count === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
