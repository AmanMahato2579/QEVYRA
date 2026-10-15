// QEVYRA Inventory — server service.
// Stock control for any business tenant: items to count (ingredients, retail
// goods, spare parts) and an append-only movement ledger. Stock is never written
// directly — every change goes through `recordMovement`, which updates the cached
// `currentStock` and stores the resulting balance (`stockAfter`) plus actor/time
// in a single transaction. Everything is tenant-scoped through `businessId` and
// gated by the `inventory.view` / `inventory.manage` permissions.
import { prisma } from "@/lib/prisma";
import { Prisma, InventoryMovementType } from "@prisma/client";

export type InventoryItemWithCount = Prisma.InventoryItemGetPayload<{
  include: { _count: { select: { movements: true } } };
}>;

export type InventoryMovementWithActor = Prisma.InventoryMovementGetPayload<{
  include: { actor: { select: { id: true; name: true } } };
}>;

export class InventoryError extends Error {
  constructor(
    public readonly code: "not_found" | "invalid" | "conflict",
    message: string
  ) {
    super(message);
  }
}

export interface InventoryItemInput {
  name: string;
  sku?: string | null;
  unit?: string;
  reorderThreshold?: number;
  initialStock?: number;
  isActive?: boolean;
}

export interface InventoryItemUpdate {
  name?: string;
  sku?: string | null;
  unit?: string;
  reorderThreshold?: number;
  isActive?: boolean;
}

export interface MovementInput {
  type: InventoryMovementType;
  /** Positive magnitude for RECEIVED/USED/WASTE; signed (may be ±) for ADJUSTMENT. */
  quantity: number;
  note?: string | null;
}

/** Normalize an optional SKU: trimmed, or null when blank (nulls never collide). */
function normalizeSku(value: string | null | undefined): string | null {
  const clean = value?.trim();
  return clean ? clean : null;
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: string }).code === "P2002";
}

/** An item is low when active stock has dropped to or below its reorder threshold. */
export function isLowStock(item: { currentStock: Prisma.Decimal | number; reorderThreshold: Prisma.Decimal | number }): boolean {
  return Number(item.currentStock) <= Number(item.reorderThreshold);
}

// ─── Items ──────────────────────────────────────────────────────────────────

export function getInventoryItems(businessId: string): Promise<InventoryItemWithCount[]> {
  return prisma.inventoryItem.findMany({
    where: { businessId },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    include: { _count: { select: { movements: true } } },
  });
}

export function getLowStockItems(businessId: string): Promise<InventoryItemWithCount[]> {
  return prisma.inventoryItem.findMany({
    where: {
      businessId,
      isActive: true,
      currentStock: { lte: prisma.inventoryItem.fields.reorderThreshold },
    },
    orderBy: { currentStock: "asc" },
    include: { _count: { select: { movements: true } } },
  });
}

export function getInventoryItem(businessId: string, itemId: string) {
  return prisma.inventoryItem.findFirst({
    where: { id: itemId, businessId },
    include: { _count: { select: { movements: true } } },
  });
}

export async function createInventoryItem(
  businessId: string,
  input: InventoryItemInput,
  actorId: string | null
): Promise<InventoryItemWithCount> {
  const initialStock = input.initialStock ?? 0;
  if (initialStock < 0) throw new InventoryError("invalid", "Initial stock cannot be negative.");

  try {
    return await prisma.$transaction(async (tx) => {
      const item = await tx.inventoryItem.create({
        data: {
          businessId,
          name: input.name.trim(),
          sku: normalizeSku(input.sku),
          unit: input.unit?.trim() || "unit",
          reorderThreshold: input.reorderThreshold ?? 0,
          currentStock: initialStock,
          isActive: input.isActive ?? true,
        },
      });
      if (initialStock > 0) {
        await tx.inventoryMovement.create({
          data: {
            businessId,
            itemId: item.id,
            type: InventoryMovementType.RECEIVED,
            quantity: initialStock,
            stockAfter: initialStock,
            note: "Opening stock",
            actorId,
          },
        });
      }
      return tx.inventoryItem.findUniqueOrThrow({
        where: { id: item.id },
        include: { _count: { select: { movements: true } } },
      });
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new InventoryError("conflict", "An item with this SKU already exists.");
    }
    throw error;
  }
}

export async function updateInventoryItem(
  businessId: string,
  itemId: string,
  input: InventoryItemUpdate
): Promise<InventoryItemWithCount> {
  const existing = await prisma.inventoryItem.findFirst({ where: { id: itemId, businessId }, select: { id: true } });
  if (!existing) throw new InventoryError("not_found", "Item not found.");

  try {
    return await prisma.inventoryItem.update({
      where: { id: itemId },
      data: {
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.sku !== undefined ? { sku: normalizeSku(input.sku) } : {}),
        ...(input.unit !== undefined ? { unit: input.unit.trim() || "unit" } : {}),
        ...(input.reorderThreshold !== undefined ? { reorderThreshold: input.reorderThreshold } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      },
      include: { _count: { select: { movements: true } } },
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new InventoryError("conflict", "An item with this SKU already exists.");
    }
    throw error;
  }
}

export async function deleteInventoryItem(businessId: string, itemId: string): Promise<void> {
  const existing = await prisma.inventoryItem.findFirst({
    where: { id: itemId, businessId },
    include: { _count: { select: { movements: true } } },
  });
  if (!existing) throw new InventoryError("not_found", "Item not found.");
  if (existing._count.movements > 0) {
    throw new InventoryError("conflict", "This item has stock history. Deactivate it instead of deleting.");
  }
  await prisma.inventoryItem.delete({ where: { id: itemId } });
}

// ─── Movements ──────────────────────────────────────────────────────────────

export function getMovements(businessId: string, itemId: string, take = 100): Promise<InventoryMovementWithActor[]> {
  return prisma.inventoryMovement.findMany({
    where: { itemId, businessId },
    orderBy: { createdAt: "desc" },
    take,
    include: { actor: { select: { id: true, name: true } } },
  });
}

function resolveDelta(input: MovementInput): number {
  const qty = Number(input.quantity);
  if (input.type === InventoryMovementType.ADJUSTMENT) {
    if (!qty) throw new InventoryError("invalid", "Adjustment quantity cannot be zero.");
    return qty;
  }
  if (!(qty > 0)) throw new InventoryError("invalid", "Quantity must be greater than zero.");
  return input.type === InventoryMovementType.RECEIVED ? qty : -qty;
}

export async function recordMovement(
  businessId: string,
  itemId: string,
  input: MovementInput,
  actorId: string | null
): Promise<InventoryMovementWithActor> {
  const existing = await prisma.inventoryItem.findFirst({ where: { id: itemId, businessId }, select: { id: true } });
  if (!existing) throw new InventoryError("not_found", "Item not found.");

  const delta = resolveDelta(input);

  return prisma.$transaction(async (tx) => {
    const updated = await tx.inventoryItem.update({
      where: { id: itemId },
      data: { currentStock: { increment: delta } },
      select: { currentStock: true },
    });
    return tx.inventoryMovement.create({
      data: {
        businessId,
        itemId,
        type: input.type,
        quantity: delta,
        stockAfter: updated.currentStock,
        note: input.note?.trim() || null,
        actorId,
      },
      include: { actor: { select: { id: true, name: true } } },
    });
  });
}
