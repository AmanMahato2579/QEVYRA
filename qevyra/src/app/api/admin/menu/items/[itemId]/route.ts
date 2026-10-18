import { prisma } from "@/lib/prisma";
import { apiGuard } from "@/lib/api-guard";
import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { httpUrlSchema } from "@/lib/utils";

const patchSchema = z.object({
  categoryId: z.string().optional(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional().nullable(),
  price: z.coerce.number().min(0).optional(),
  imageUrl: httpUrlSchema.optional().nullable().or(z.literal("")),
  isAvailable: z.boolean().optional(),
  hasSpicyOption: z.boolean().optional(),
  hasNoteOption: z.boolean().optional(),
  requiresPreparation: z.boolean().optional(),
  ingredients: z.string().optional().nullable(),
  discountPercent: z.coerce.number().int().min(0).max(100).optional(),
  variants: z.array(z.object({
    id: z.string().optional(),
    name: z.string().trim().min(1).max(50),
    price: z.coerce.number().positive(),
    foodType: z.enum(["VEG", "NON_VEG", "NONE"]).optional().nullable(),
    isAvailable: z.boolean().optional(),
  })).max(20).optional(),
  recipe: z.array(z.object({
    inventoryItemId: z.string(),
    quantity: z.coerce.number().positive(),
  })).max(20).optional(),
});

/** The item-level food type is derived from its variants (no separate input). */
function deriveFoodType(variants: { foodType?: string | null }[]): "VEG" | "NON_VEG" | "NONE" {
  if (variants.some((v) => v.foodType === "NON_VEG")) return "NON_VEG";
  if (variants.some((v) => v.foodType === "VEG")) return "VEG";
  return "NONE";
}

/**
 * Resolve the tenant's businessId (needed for inventory recipe validation).
 * Restaurants without a linked business have no inventory → no recipes.
 */
async function businessIdForRestaurant(restaurantId: string): Promise<string | null> {
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: { businessId: true },
  });
  return restaurant?.businessId ?? null;
}

/**
 * Validate recipe lines against the tenant's own inventory items. Returns an
 * error message, or null when valid. Duplicate inventory items are collapsed
 * (the unique constraint would reject them anyway).
 */
async function validateRecipe(
  businessId: string | null,
  recipe: { inventoryItemId: string }[]
): Promise<string | null> {
  if (recipe.length === 0) return null;
  if (!businessId) {
    return "Inventory is not configured for this business — no recipe can be linked.";
  }
  const ids = [...new Set(recipe.map((r) => r.inventoryItemId))];
  const owned = await prisma.inventoryItem.count({
    where: { id: { in: ids }, businessId, isActive: true },
  });
  if (owned !== ids.length) {
    return "One or more inventory items are invalid for this business.";
  }
  return null;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const guard = await apiGuard({ permission: "catalog.manage" });
  if (guard.error) return guard.error;
  const restaurantId = guard.user.restaurantId;
  if (!restaurantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { itemId } = await params;
  const existing = await prisma.menuItem.findFirst({ where: { id: itemId, restaurantId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { variants, recipe, ...rest } = parsed.data;
  const updateData = { ...rest } as Prisma.MenuItemUpdateInput;
  if (parsed.data.imageUrl === "") updateData.imageUrl = null;

  if (variants && variants.length > 0 && (!updateData.price || Number(updateData.price) <= 0)) {
    updateData.price = Math.max(...variants.map(v => v.price));
  }

  if (recipe) {
    const recipeError = await validateRecipe(await businessIdForRestaurant(restaurantId), recipe);
    if (recipeError) return NextResponse.json({ error: recipeError }, { status: 400 });
  }

  // Sync variants in place: keep the same row ids whenever possible so that
  // per-variant availability and existing order-item links are preserved.
  // Only variants that were removed from the submitted list are deleted.
  const ops: Prisma.PrismaPromise<unknown>[] = [];

  if (variants) {
    if (variants.length === 0) {
      updateData.foodType = "NONE";
      ops.push(prisma.menuItemVariant.deleteMany({ where: { menuItemId: itemId } }));
    } else {
      updateData.foodType = deriveFoodType(variants);

      const current = await prisma.menuItemVariant.findMany({ where: { menuItemId: itemId } });
      const currentById = new Map(current.map((v) => [v.id, v]));
      const validIds = new Set<string>();
      for (const v of variants) {
        if (v.id && currentById.has(v.id)) validIds.add(v.id);
      }

      // New variants append after the existing ones (in the currently ordered
      // list) instead of tying at sortOrder 0.
      let nextSortOrder = current.length;

      ops.push(
        prisma.menuItemVariant.deleteMany({
          where: { menuItemId: itemId, id: { notIn: [...validIds] } },
        })
      );

      for (const v of variants) {
        if (v.id && validIds.has(v.id)) {
          ops.push(
            prisma.menuItemVariant.update({
              where: { id: v.id },
              data: {
                name: v.name,
                price: v.price,
                foodType: v.foodType ?? null,
                isAvailable: v.isAvailable ?? true,
              },
            })
          );
        } else {
          ops.push(
            prisma.menuItemVariant.create({
              data: {
                menuItemId: itemId,
                name: v.name,
                price: v.price,
                foodType: v.foodType ?? null,
                isAvailable: v.isAvailable ?? true,
                sortOrder: nextSortOrder++,
              },
            })
          );
        }
      }
    }
  }

  // Recipe rows have no external dependents (nothing links to them), so a
  // full delete+recreate is simpler and safer than variant-style diffing.
  if (recipe) {
    ops.push(prisma.menuItemRecipe.deleteMany({ where: { menuItemId: itemId } }));
    if (recipe.length > 0) {
      ops.push(
        prisma.menuItemRecipe.createMany({
          data: recipe.map((r) => ({
            menuItemId: itemId,
            inventoryItemId: r.inventoryItemId,
            quantity: r.quantity,
          })),
        })
      );
    }
  }

  ops.push(prisma.menuItem.update({ where: { id: itemId }, data: updateData }));

  const updated = await prisma.$transaction(ops);
  return NextResponse.json(updated[updated.length - 1]);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const guard = await apiGuard({ permission: "catalog.manage" });
  if (guard.error) return guard.error;
  const restaurantId = guard.user.restaurantId;
  if (!restaurantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { itemId } = await params;
  const existing = await prisma.menuItem.findFirst({ where: { id: itemId, restaurantId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Items referenced by past orders cannot be hard-deleted (the FK is
  // restrictive by design so order history keeps its snapshot). Tell the user
  // instead of returning a 500 constraint error.
  const usage = await prisma.orderItem.count({ where: { menuItemId: itemId } });
  if (usage > 0) {
    return NextResponse.json(
      { error: "This item has been ordered before, so it can't be deleted. Set it as unavailable instead." },
      { status: 409 }
    );
  }

  await prisma.menuItem.delete({ where: { id: itemId } });
  return NextResponse.json({ success: true });
}
