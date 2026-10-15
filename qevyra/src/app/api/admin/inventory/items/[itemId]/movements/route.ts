import { NextResponse } from "next/server";
import { z } from "zod";
import { apiGuard, parseBody } from "@/lib/api-guard";
import { getMovements, recordMovement } from "@/modules/inventory/services";
import { inventoryErrorResponse } from "@/modules/inventory/http";

const movementSchema = z.object({
  type: z.enum(["RECEIVED", "USED", "WASTE", "ADJUSTMENT"]),
  quantity: z.coerce.number(),
  note: z.string().trim().max(200).nullable().optional(),
});

export async function GET(_req: Request, { params }: { params: Promise<{ itemId: string }> }) {
  const guard = await apiGuard({ permission: "inventory.view" });
  if (guard.error) return guard.error;
  const businessId = guard.user.businessId;
  if (!businessId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { itemId } = await params;
  const movements = await getMovements(businessId, itemId);
  return NextResponse.json(movements);
}

export async function POST(req: Request, { params }: { params: Promise<{ itemId: string }> }) {
  const guard = await apiGuard({ permission: "inventory.manage" });
  if (guard.error) return guard.error;
  const businessId = guard.user.businessId;
  if (!businessId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { itemId } = await params;
  const body = await parseBody(req, movementSchema);
  if (body.error) return body.error;

  try {
    const movement = await recordMovement(businessId, itemId, body.data, guard.user.id);
    return NextResponse.json(movement, { status: 201 });
  } catch (error) {
    return inventoryErrorResponse(error);
  }
}
