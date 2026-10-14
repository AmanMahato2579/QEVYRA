import { prisma } from "@/lib/prisma";
import { apiGuard } from "@/lib/api-guard";
import { NextResponse } from "next/server";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const guard = await apiGuard({ permission: "orders.manage" });
  if (guard.error) return guard.error;
  const restaurantId = guard.user.restaurantId;
  if (!restaurantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sessionId } = await params;

  const closed = await prisma.$transaction(async (tx) => {
    // Guarded close: only an ACTIVE session can be closed. Combined with the
    // SELECT ... FOR UPDATE taken by createOrder, an order can never be placed
    // into a session that is closing right now.
    const close = await tx.tableSession.updateMany({
      where: { id: sessionId, restaurantId, status: "ACTIVE" },
      data: { status: "CLOSED", closedAt: new Date() },
    });
    if (close.count !== 1) return false;

    // Automatically mark any remaining running orders in this session as COMPLETED
    await tx.order.updateMany({
      where: {
        tableSessionId: sessionId,
        status: { notIn: ["COMPLETED", "REJECTED"] },
      },
      data: { status: "COMPLETED", statusChangedAt: new Date() },
    });
    return true;
  });

  if (!closed) {
    return NextResponse.json({ error: "Session not found or already closed" }, { status: 409 });
  }

  return NextResponse.json({ success: true });
}
