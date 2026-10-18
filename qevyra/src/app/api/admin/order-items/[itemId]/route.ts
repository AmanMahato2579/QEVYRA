import { setOrderItemStatus, serveOrderItem, setOrderItemQuantity } from "@/lib/db";
import { apiGuard } from "@/lib/api-guard";
import { prisma } from "@/lib/prisma";
import { restoreStockForOrder, adjustStockForQuantityChange } from "@/lib/order-inventory";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("status"),
    status: z.enum(["NEW", "PREPARING", "SERVED", "CANCELLED"]),
    reason: z.string().trim().optional(),
  }),
  z.object({ action: z.literal("serve") }),
  z.object({ action: z.literal("quantity"), quantity: z.number().int().positive() }),
]);

type ApiError = Error & { code?: string };

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const guard = await apiGuard({ permission: "orders.manage" });
  if (guard.error) return guard.error;
  const restaurantId = guard.user.restaurantId;
  if (!restaurantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { itemId } = await params;

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  try {
    let result;
    if (parsed.data.action === "status") {
      // Read the pre-change item state so an idempotent re-cancel (the service
      // early-returns on same-status) cannot restore stock twice.
      const before =
        parsed.data.status === "CANCELLED"
          ? await prisma.orderItem.findUnique({
              where: { id: itemId },
              select: {
                status: true,
                quantity: true,
                menuItemId: true,
                order: { select: { id: true, status: true, orderNumber: true } },
              },
            })
          : null;
      result = await setOrderItemStatus(itemId, restaurantId, parsed.data.status, parsed.data.reason);
      if (!result) return NextResponse.json({ error: "Item not found" }, { status: 404 });
      // Cancelling an item on an accepted order returns its ingredients to
      // stock (best-effort). PENDING orders never consumed; REJECTED orders
      // already had their whole stock restored at rejection time.
      if (
        before &&
        before.status !== "CANCELLED" &&
        result.status === "CANCELLED" &&
        before.order.status !== "PENDING" &&
        before.order.status !== "REJECTED"
      ) {
        await restoreStockForOrder(
          restaurantId,
          before.order.orderNumber,
          [{ menuItemId: before.menuItemId, quantity: before.quantity }],
          guard.user.id,
          "item cancelled"
        );
      }
    } else if (parsed.data.action === "serve") {
      result = await serveOrderItem(itemId, restaurantId);
    } else {
      // Quantity change: read the pre-change state first so the stock delta
      // (new − old) can be booked after the update lands.
      const before = await prisma.orderItem.findUnique({
        where: { id: itemId },
        select: {
          quantity: true,
          menuItemId: true,
          order: { select: { status: true, orderNumber: true } },
        },
      });
      result = await setOrderItemQuantity(itemId, restaurantId, parsed.data.quantity);
      if (!result) return NextResponse.json({ error: "Item not found" }, { status: 404 });
      if (
        before &&
        result.quantity !== before.quantity &&
        before.order.status !== "PENDING" &&
        before.order.status !== "REJECTED"
      ) {
        await adjustStockForQuantityChange(
          restaurantId,
          before.order.orderNumber,
          before.menuItemId,
          before.quantity,
          result.quantity,
          before.order.status,
          guard.user.id
        );
      }
    }
    return NextResponse.json(result);
  } catch (err) {
    const e = err as ApiError;
    if (e.code === "NOT_FOUND") {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }
    return NextResponse.json({ error: e.message ?? "Operation failed" }, { status: 400 });
  }
}

// Item deletion is intentionally not exposed: removing food goes through the
// status lifecycle (CANCEL) so an audit trail is preserved in the bill.
export async function DELETE() {
  const guard = await apiGuard({ permission: "orders.manage" });
  if (guard.error) return guard.error;
  // Safer to refuse hard-delete of order items — use CANCEL instead.
  return NextResponse.json({ error: "Use Cancel instead of delete" }, { status: 405 });
}