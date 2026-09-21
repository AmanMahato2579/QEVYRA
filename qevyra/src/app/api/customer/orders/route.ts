import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createOrder } from "@/lib/db";
import { loadOperationalRestaurant, getEffectiveAccess, canOrder } from "@/lib/plans";
import { rateLimit, clientIp } from "@/lib/rate-limit";

const orderSchema = z.object({
  restaurantId: z.string(),
  tableSessionId: z.string(),
  customerToken: z.string(),
  clientRequestId: z.string().optional(),
  items: z.array(
    z.object({
      menuItemId: z.string(),
      variantId: z.string().optional(),
      quantity: z.number().int().positive(),
      isSpicy: z.boolean(),
      note: z.string(),
    })
  ).min(1, "Cart is empty"),
});

export async function POST(req: Request) {
  // Customer endpoint - no auth required, but we validate everything server-side
  if (!rateLimit(`order:${clientIp(req)}`, 20, 60_000)) {
    return NextResponse.json({ error: "Too many attempts. Try again in a minute." }, { status: 429 });
  }

  const body = await req.json();
  const parsed = orderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { restaurantId, tableSessionId, customerToken, items, clientRequestId } = parsed.data;

  // Idempotency: a client that retried (or double-tapped submit) with the same
  // request key gets its original order back instead of a duplicate.
  const requestKey = clientRequestId?.trim() || null;
  if (requestKey) {
    const existing = await prisma.order.findFirst({
      where: { tableSessionId, clientRequestId: requestKey },
      select: { id: true, orderNumber: true },
    });
    if (existing) {
      return NextResponse.json({ ok: true, duplicate: true, id: existing.id, orderNumber: existing.orderNumber }, { status: 200 });
    }
  }

  const restaurant = await loadOperationalRestaurant(restaurantId);
  if (!restaurant?.business || !restaurant.business.isActive) {
    return NextResponse.json({ error: "Restaurant is unavailable" }, { status: 403 });
  }
  const access = await getEffectiveAccess(restaurant.business);
  if (!canOrder(access)) {
    return NextResponse.json({ error: "Ordering is not available at this restaurant." }, { status: 403 });
  }

  // Validate the table session belongs to this restaurant (tenant isolation, no trust in client)
  const session = await prisma.tableSession.findFirst({
    where: { id: tableSessionId, restaurantId, status: "ACTIVE" },
  });

  if (!session) {
    return NextResponse.json(
      { error: "Invalid or expired session. Please scan the QR code again." },
      { status: 400 }
    );
  }

  try {
    const order = await createOrder({ restaurantId, tableSessionId, customerToken, items, clientRequestId: requestKey });
    return NextResponse.json(order, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
