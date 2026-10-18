import { prisma } from "@/lib/prisma";
import { apiGuard } from "@/lib/api-guard";
import { NextResponse } from "next/server";
import { z } from "zod";
import { httpUrlSchema } from "@/lib/utils";

const itemSchema = z.object({
  categoryId: z.string(),
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  price: z.coerce.number().min(0).default(0),
  imageUrl: httpUrlSchema.optional().nullable().or(z.literal("")),
  isAvailable: z.boolean().default(true),
  hasSpicyOption: z.boolean().default(false),
  hasNoteOption: z.boolean().default(true),
  requiresPreparation: z.boolean().default(true),
  ingredients: z.string().optional().nullable(),
  discountPercent: z.coerce.number().int().min(0).max(100).default(0),
  variants: z.array(z.object({
    name: z.string().trim().min(1).max(50),
    price: z.coerce.number().positive(),
    foodType: z.enum(["VEG", "NON_VEG", "NONE"]).optional().nullable(),
    isAvailable: z.boolean().optional(),
  })).max(20).default([]),
  recipe: z.array(z.object({
    inventoryItemId: z.string(),
    quantity: z.coerce.number().positive(),
  })).max(20).default([]),
}).superRefine((data, ctx) => {
  if ((!data.variants || data.variants.length === 0) && data.price <= 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Price must be greater than 0 when no variants are added",
      path: ["price"],
    });
  }
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

export async function POST(req: Request) {
  const guard = await apiGuard({ permission: "catalog.manage" });
  if (guard.error) return guard.error;
  const restaurantId = guard.user.restaurantId;
  if (!restaurantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = itemSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  // Verify category belongs to this restaurant
  const category = await prisma.category.findFirst({
    where: { id: parsed.data.categoryId, restaurantId },
  });
  if (!category) return NextResponse.json({ error: "Category not found" }, { status: 404 });

  const recipeError = await validateRecipe(await businessIdForRestaurant(restaurantId), parsed.data.recipe);
  if (recipeError) return NextResponse.json({ error: recipeError }, { status: 400 });

  // If variants exist and base price is 0, auto-fill base price with highest variant price
  let finalPrice = parsed.data.price;
  if (parsed.data.variants.length > 0 && finalPrice <= 0) {
    finalPrice = Math.max(...parsed.data.variants.map(v => v.price));
  }

  const { recipe, ...itemData } = parsed.data;
  const item = await prisma.menuItem.create({
    data: {
      ...itemData,
      price: finalPrice,
      restaurantId,
      categoryId: category.id,
      sortOrder: await prisma.menuItem.count({ where: { categoryId: category.id } }),
      foodType: deriveFoodType(parsed.data.variants),
      imageUrl: parsed.data.imageUrl || null,
      variants: { create: parsed.data.variants },
      recipe: {
        create: recipe.map((r) => ({
          inventoryItemId: r.inventoryItemId,
          quantity: r.quantity,
        })),
      },
    },
  });
  return NextResponse.json(item, { status: 201 });
}
