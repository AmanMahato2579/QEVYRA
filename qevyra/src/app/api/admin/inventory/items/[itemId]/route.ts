import { NextResponse } from "next/server";
import { z } from "zod";
import { apiGuard, parseBody } from "@/lib/api-guard";
import { deleteInventoryItem, getInventoryItem, updateInventoryItem } from "@/modules/inventory/services";
import { inventoryErrorResponse } from "@/modules/inventory/http";

const updateSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  sku: z.string().trim().max(60).nullable().optional(),
  unit: z.string().trim().max(20).optional(),
  reorderThreshold: z.coerce.number().min(0).optional(),
  isActive: z.boolean().optional(),
});

export async function GET(_req: Request, { params }: { params: Promise<{ itemId: string }> }) {
  const guard = await apiGuard({ permission: "inventory.view" });
  if (guard.error) return guard.error;
  const businessId = guard.user.businessId;
  if (!businessId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { itemId } = await params;
  const item = await getInventoryItem(businessId, itemId);
  if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });
  return NextResponse.json(item);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ itemId: string }> }) {
  const guard = await apiGuard({ permission: "inventory.manage" });
  if (guard.error) return guard.error;
  const businessId = guard.user.businessId;
  if (!businessId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { itemId } = await params;
  const body = await parseBody(req, updateSchema);
  if (body.error) return body.error;

  try {
    const item = await updateInventoryItem(businessId, itemId, body.data);
    return NextResponse.json(item);
  } catch (error) {
    return inventoryErrorResponse(error);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ itemId: string }> }) {
  const guard = await apiGuard({ permission: "inventory.manage" });
  if (guard.error) return guard.error;
  const businessId = guard.user.businessId;
  if (!businessId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { itemId } = await params;
  try {
    await deleteInventoryItem(businessId, itemId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return inventoryErrorResponse(error);
  }
}
