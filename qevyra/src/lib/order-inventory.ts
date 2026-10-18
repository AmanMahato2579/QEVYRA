// Order → Inventory bridge (platform core).
// Best-effort stock bookkeeping driven by the order lifecycle:
//   • consume when an order commits (ACCEPTED customer order or a waiter order
//     born ACCEPTED) — aggregated into one USED movement per inventory item;
//   • restore when an accepted order is rejected, an accepted order's item is
//     cancelled, or its quantity drops — via compensating ADJUSTMENT movements.
// Every call is wrapped so an inventory failure can NEVER block an order; the
// ledger simply misses a row and the movement history shows the gap. Movements
// are recorded through the inventory module's `recordMovement` service so the
// stock-after roll-up, actor, and tenant checks stay in one place.
import { prisma } from "@/lib/prisma";
import { recordMovement } from "@/modules/inventory/services";

export interface OrderLine {
  menuItemId: string;
  quantity: number;
  status?: string;
}

/** Resolve a restaurant's businessId; null means "no inventory tenant" (skip). */
async function businessIdForRestaurant(restaurantId: string): Promise<string | null> {
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: { businessId: true },
  });
  return restaurant?.businessId ?? null;
}

/**
 * Aggregate the recipes of the given order lines into per-inventory-item
 * totals: [inventoryItemId, totalQuantity]. Skips cancelled lines.
 */
async function recipeTotalsForLines(
  lines: OrderLine[],
  businessId: string
): Promise<Map<string, number>> {
  const totals = new Map<string, number>();
  const active = lines.filter((l) => l.status !== "CANCELLED");
  if (active.length === 0) return totals;

  const menuItemIds = [...new Set(active.map((l) => l.menuItemId))];
  const recipes = await prisma.menuItemRecipe.findMany({
    where: {
      menuItemId: { in: menuItemIds },
      inventoryItem: { businessId, isActive: true },
    },
    select: { menuItemId: true, inventoryItemId: true, quantity: true },
  });
  if (recipes.length === 0) return totals;

  const byMenuItem = new Map<string, OrderLine[]>();
  for (const line of active) {
    const bucket = byMenuItem.get(line.menuItemId);
    if (bucket) bucket.push(line);
    else byMenuItem.set(line.menuItemId, [line]);
  }

  for (const recipe of recipes) {
    const qty = Number(recipe.quantity);
    if (!(qty > 0)) continue;
    const linesForItem = byMenuItem.get(recipe.menuItemId);
    if (!linesForItem) continue;
    const units = linesForItem.reduce((sum, l) => sum + l.quantity, 0);
    const total = qty * units;
    if (total <= 0) continue;
    totals.set(recipe.inventoryItemId, (totals.get(recipe.inventoryItemId) ?? 0) + total);
  }
  return totals;
}

/**
 * Consume stock for an order's items. Call when the order commits: a customer
 * order transitioning to ACCEPTED, or a waiter order created as ACCEPTED.
 * Best-effort — never throws into the caller.
 */
export async function consumeStockForOrder(
  restaurantId: string,
  orderNumber: number,
  lines: OrderLine[],
  actorId: string | null
): Promise<void> {
  try {
    const businessId = await businessIdForRestaurant(restaurantId);
    if (!businessId) return;
    const totals = await recipeTotalsForLines(lines, businessId);
    for (const [inventoryItemId, quantity] of totals) {
      await recordMovement(
        businessId,
        inventoryItemId,
        { type: "USED", quantity, note: `Order #${orderNumber} accepted` },
        actorId
      );
    }
  } catch (error) {
    console.error("[order-inventory] consume failed", { orderNumber, error });
  }
}

/**
 * Restore stock for an order that was consumed but is now rejected or has a
 * cancelled/quantity-reduced item. `lines` should be the lines whose stock was
 * consumed (all lines at reject; the single cancelled line; or both old+new
 * quantity of a resized line). Best-effort — never throws into the caller.
 */
export async function restoreStockForOrder(
  restaurantId: string,
  orderNumber: number,
  lines: OrderLine[],
  actorId: string | null,
  reason: string
): Promise<void> {
  try {
    const businessId = await businessIdForRestaurant(restaurantId);
    if (!businessId) return;
    const totals = await recipeTotalsForLines(lines, businessId);
    for (const [inventoryItemId, quantity] of totals) {
      await recordMovement(
        businessId,
        inventoryItemId,
        { type: "ADJUSTMENT", quantity, note: `Order #${orderNumber} ${reason}` },
        actorId
      );
    }
  } catch (error) {
    console.error("[order-inventory] restore failed", { orderNumber, reason, error });
  }
}

/**
 * Adjust stock after an order line's quantity changed. If the order has not
 * been accepted yet (still PENDING/REJECTED) no stock was consumed, so this
 * is a no-op. Otherwise the delta (new − old) is consumed (USED) when positive
 * and restored (ADJUSTMENT) when negative. Best-effort.
 */
export async function adjustStockForQuantityChange(
  restaurantId: string,
  orderNumber: number,
  menuItemId: string,
  oldQuantity: number,
  newQuantity: number,
  orderStatus: string,
  actorId: string | null
): Promise<void> {
  const delta = newQuantity - oldQuantity;
  if (delta === 0) return;
  if (orderStatus === "PENDING" || orderStatus === "REJECTED") return;
  if (delta > 0) {
    await consumeStockForOrder(restaurantId, orderNumber, [{ menuItemId, quantity: delta }], actorId);
  } else {
    await restoreStockForOrder(
      restaurantId,
      orderNumber,
      [{ menuItemId, quantity: -delta }],
      actorId,
      "quantity reduced"
    );
  }
}
