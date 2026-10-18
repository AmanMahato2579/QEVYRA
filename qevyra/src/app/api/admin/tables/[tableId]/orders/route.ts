import { createWaiterOrder } from "@/lib/db";
import { apiGuard } from "@/lib/api-guard";
import { consumeStockForOrder } from "@/lib/order-inventory";
import { NextResponse } from "next/server";
import { z } from "zod";
import { loadOperationalRestaurant, getEffectiveAccess, canOrder } from "@/lib/plans";

const waiterOrderSchema = z.object({
  items: z.array(
    z.object({
      menuItemId: z.string(),
      variantId: z.string().optional().nullable(),
      quantity: z.number().int().positive(),
      isSpicy: z.boolean().optional(),
      note: z.string().optional(),
    })
  ).min(1, "No items selected"),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ tableId: string }> }
) {
  const guard = await apiGuard({ permission: "orders.manage" });
  if (guard.error) return guard.error;
  const restaurantId = guard.user.restaurantId;
  if (!restaurantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const restaurant = await loadOperationalRestaurant(restaurantId);
  if (!restaurant?.business) return NextResponse.json({ error: "Restaurant unavailable" }, { status: 403 });
  const access = await getEffectiveAccess(restaurant.business);
  if (!canOrder(access)) {
    return NextResponse.json({ error: "Ordering is not enabled for your plan." }, { status: 403 });
  }

  const { tableId } = await params;

  const parsed = waiterOrderSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const order = await createWaiterOrder({
      restaurantId,
      tableId,
      items: parsed.data.items,
    });
    // Waiter orders are born ACCEPTED — consume stock right after commit.
    // Best-effort: an inventory failure never fails the order.
    await consumeStockForOrder(
      restaurantId,
      order.orderNumber,
      order.orderItems.map((i) => ({ menuItemId: i.menuItemId, quantity: i.quantity, status: i.status })),
      guard.user.id
    );
    return NextResponse.json(order, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}