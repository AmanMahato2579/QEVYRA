import { prisma } from "@/lib/prisma";
import { apiGuard } from "@/lib/api-guard";
import { OrderStatus } from "@prisma/client";
import { NextResponse } from "next/server";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ tableId: string }> }
) {
  const guard = await apiGuard({ permission: "orders.manage" });
  if (guard.error) return guard.error;
  const restaurantId = guard.user.restaurantId;
  if (!restaurantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { tableId } = await params;

  // Close all active sessions for this table in one transaction so orders
  // cannot slip into a session mid-close.
  const closed = await prisma.$transaction(async (tx) => {
    const actives = await tx.tableSession.findMany({
      where: { tableId, restaurantId, status: "ACTIVE" },
      select: { id: true },
    });
    if (actives.length === 0) return false;

    await tx.tableSession.updateMany({
      where: { id: { in: actives.map((s) => s.id) }, status: "ACTIVE" },
      data: { status: "CLOSED", closedAt: new Date() },
    });

    // Mark all orders in these sessions as COMPLETED
    const sessionIds = actives.map((s) => s.id);
    const running = await tx.order.findMany({
      where: {
        tableSessionId: { in: sessionIds },
        status: { notIn: ["COMPLETED", "REJECTED"] },
      },
      select: { id: true, status: true },
    });
    if (running.length > 0) {
      await tx.order.updateMany({
        where: { id: { in: running.map((o) => o.id) } },
        data: { status: "COMPLETED", statusChangedAt: new Date() },
      });
      await tx.orderStatusHistory.createMany({
        data: running.map((o) => ({
          orderId: o.id,
          fromStatus: o.status,
          toStatus: OrderStatus.COMPLETED,
          note: "Session closed",
        })),
      });
    }
    return true;
  });

  if (!closed) {
    return NextResponse.json({ error: "No active session for this table" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
