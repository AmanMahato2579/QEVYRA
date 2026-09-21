import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ tableId: string }> }
) {
  const session = await auth();
  const restaurantId = (session?.user as { restaurantId?: string | null })?.restaurantId;
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
    await tx.order.updateMany({
      where: {
        tableSessionId: { in: actives.map((s) => s.id) },
        status: { notIn: ["COMPLETED", "REJECTED"] },
      },
      data: { status: "COMPLETED", statusChangedAt: new Date() },
    });
    return true;
  });

  if (!closed) {
    return NextResponse.json({ error: "No active session for this table" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
