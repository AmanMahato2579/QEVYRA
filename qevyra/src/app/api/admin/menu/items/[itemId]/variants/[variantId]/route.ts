import { prisma } from "@/lib/prisma";
import { apiGuard } from "@/lib/api-guard";
import { NextResponse } from "next/server";
import { z } from "zod";

const patchSchema = z.object({
  isAvailable: z.boolean(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ itemId: string; variantId: string }> }
) {
  const guard = await apiGuard({ permission: "catalog.manage" });
  if (guard.error) return guard.error;
  const restaurantId = guard.user.restaurantId;
  if (!restaurantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { itemId, variantId } = await params;

  // The item must exist and belong to this restaurant first.
  const item = await prisma.menuItem.findFirst({ where: { id: itemId, restaurantId } });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const variant = await prisma.menuItemVariant.findFirst({ where: { id: variantId, menuItemId: itemId } });
  if (!variant) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const updated = await prisma.menuItemVariant.update({
    where: { id: variantId },
    data: { isAvailable: parsed.data.isAvailable },
  });
  return NextResponse.json(updated);
}