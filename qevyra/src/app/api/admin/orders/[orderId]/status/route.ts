import { prisma } from "@/lib/prisma";
import { apiGuard } from "@/lib/api-guard";
import { createNotification } from "@/lib/notifications";
import { orderRejectedMessage, orderRejectedTitle } from "@/lib/i18n";
import { consumeStockForOrder, restoreStockForOrder } from "@/lib/order-inventory";
import { NextResponse } from "next/server";
import { z } from "zod";

const statusSchema = z.object({
  // Order-level status now only drives the intake/acknowledgment lifecycle.
  // Food progress is tracked per item (NEW → PREPARING → SERVED), so the
  // legacy READY/COMPLETED values are intentionally no longer accepted here.
  status: z.enum(["PENDING", "ACCEPTED", "REJECTED"]),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const guard = await apiGuard({ permission: "orders.manage" });
  if (guard.error) return guard.error;
  const restaurantId = guard.user.restaurantId;

  if (!restaurantId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { orderId } = await params;

  const body = await req.json();
  const parsed = statusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  // Ensure order belongs to this restaurant (tenant isolation)
  const order = await prisma.order.findFirst({
    where: { id: orderId, restaurantId },
    include: {
      orderItems: true,
      tableSession: { include: { table: true } },
    },
  });

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const updated = await prisma.$transaction(async (tx) => {
    const next = await tx.order.update({
      where: { id: orderId },
      data: { status: parsed.data.status, statusChangedAt: new Date() },
    });
    if (order.status !== parsed.data.status) {
      await tx.orderStatusHistory.create({
        data: {
          orderId,
          fromStatus: order.status,
          toStatus: parsed.data.status,
          note: parsed.data.status === "ACCEPTED" ? "Order accepted" : "Order rejected",
        },
      });
    }
    return next;
  });

  // Best-effort stock bookkeeping AFTER the status commit — inventory issues
  // never block order flow. Stock is consumed when an order is accepted (the
  // kitchen commits to cooking it) and restored if an already-accepted order
  // is rejected afterwards.
  const lines = order.orderItems.map((i) => ({
    menuItemId: i.menuItemId,
    quantity: i.quantity,
    status: i.status,
  }));
  if (parsed.data.status === "ACCEPTED" && order.status === "PENDING") {
    await consumeStockForOrder(restaurantId, order.orderNumber, lines, guard.user.id);
  }
  if (parsed.data.status === "REJECTED" && order.status === "ACCEPTED") {
    await restoreStockForOrder(
      restaurantId,
      order.orderNumber,
      lines,
      guard.user.id,
      "rejected after acceptance"
    );
  }

  // Accepting an order also moves its pending items into the kitchen queue —
  // acceptance and "start preparing" happen in one step.
  if (parsed.data.status === "ACCEPTED") {
    await prisma.orderItem.updateMany({
      where: { orderId, status: "NEW" },
      data: { status: "PREPARING" },
    });
  }

  if (parsed.data.status === "REJECTED") {
    const tableNumber = order.tableSession?.table?.tableNumber;
    const itemSummary = order.orderItems
      .map((i) => `${i.menuItemName} ×${i.quantity}`)
      .join(", ");
    const lang = (await prisma.restaurant.findUnique({ where: { id: restaurantId }, select: { language: true } }))?.language ?? "EN";
    await createNotification({
      restaurantId,
      type: "ORDER_STATUS",
      title: orderRejectedTitle(lang, order.orderNumber),
      message: orderRejectedMessage(lang, tableNumber, itemSummary),
      link: "/admin/orders",
    });
  }

  return NextResponse.json(updated);
}
