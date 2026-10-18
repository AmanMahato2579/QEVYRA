import { NextResponse } from "next/server";
import { z } from "zod";
import { apiGuard, parseBody } from "@/lib/api-guard";
import { createInventoryItem, getInventoryItems } from "@/modules/inventory/services";
import { inventoryErrorResponse } from "@/modules/inventory/http";

const createSchema = z.object({
  name: z.string().trim().min(1).max(120),
  sku: z.string().trim().max(60).nullable().optional(),
  unit: z.string().trim().max(20).optional(),
  reorderThreshold: z.coerce.number().min(0).optional(),
  initialStock: z.coerce.number().min(0).optional(),
  isActive: z.boolean().optional(),
});

export async function GET() {
  const guard = await apiGuard({ permission: "inventory.view" });
  if (guard.error) return guard.error;
  const businessId = guard.user.businessId;
  if (!businessId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const items = await getInventoryItems(businessId);
  return NextResponse.json(items);
}

export async function POST(req: Request) {
  const guard = await apiGuard({ permission: "inventory.manage" });
  if (guard.error) return guard.error;
  const businessId = guard.user.businessId;
  if (!businessId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await parseBody(req, createSchema);
  if (body.error) return body.error;

  try {
    const item = await createInventoryItem(businessId, body.data, guard.user.id);
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    return inventoryErrorResponse(error);
  }
}
