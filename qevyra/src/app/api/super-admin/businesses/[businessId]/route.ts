import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";
import { ProductType } from "@prisma/client";
import { BRAND_COLOR_KEYS } from "@/lib/brand";
import { logActivity } from "@/lib/activity";

async function isSuperAdmin() {
  const session = await auth();
  return (session?.user as { role?: string })?.role === "SUPER_ADMIN";
}

const productActivationSchema = z.object({
  productId: z.nativeEnum(ProductType),
  isActive: z.boolean(),
});

const patchSchema = z
  .object({
    name: z.string().min(2).max(200).optional(),
    description: z.string().max(1000).nullable().optional(),
    phone: z.string().max(50).nullable().optional(),
    address: z.string().max(500).nullable().optional(),
    tableLimit: z.number().int().min(0).max(200).optional(),
    isActive: z.boolean().optional(),
    plan: z.enum(["STAR", "SILVER", "BRONZE"]).optional(),
    bookingsEnabled: z.boolean().optional(),
    brandColor: z.string().refine((v) => BRAND_COLOR_KEYS.has(v)).optional(),
    subscriptionStatus: z.enum(["ACTIVE", "EXPIRED", "CANCELLED", "SUSPENDED"]).optional(),
    subscriptionStart: z.string().datetime().nullable().optional(),
    subscriptionExpiresAt: z.string().datetime().nullable().optional(),
    neverExpires: z.boolean().optional(),
    autoOff: z.boolean().optional(),
    starNumber: z.number().int().min(1).max(10).nullable().optional(),
    starNote: z.string().max(500).nullable().optional(),
    extendDays: z.number().int().min(1).max(3650).optional(),
    products: z.array(productActivationSchema).optional(),
  })
  .refine((v) => !(v.starNumber === undefined && v.starNote !== undefined), {
    message: "starNote requires starNumber",
  });

type PatchData = z.infer<typeof patchSchema>;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ businessId: string }> }
) {
  if (!(await isSuperAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { businessId } = await params;

  const business = await prisma.business.findUnique({
    where: { id: businessId },
    include: {
      restaurant: { include: { _count: { select: { tables: true } } } },
      products: { include: { product: true } },
      users: { select: { id: true, name: true, email: true, role: true, createdAt: true }, orderBy: { createdAt: "asc" } },
      _count: { select: { workflows: true, tickets: true } },
      website: { select: { id: true, isPublished: true } },
    },
  });
  if (!business) return NextResponse.json({ error: "Business not found" }, { status: 404 });

  return NextResponse.json(business);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ businessId: string }> }
) {
  if (!(await isSuperAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { businessId } = await params;

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const data: PatchData = parsed.data;

  const business = await prisma.business.findUnique({
    where: { id: businessId },
    include: {
      restaurant: { select: { id: true, isActive: true } },
      products: { select: { productId: true, isActive: true } },
    },
  });
  if (!business) return NextResponse.json({ error: "Business not found" }, { status: 404 });
  const restaurant = business.restaurant;

  if (data.tableLimit !== undefined && data.tableLimit > 0 && restaurant) {
    const tableCount = await prisma.table.count({ where: { restaurantId: restaurant.id } });
    if (data.tableLimit < tableCount)
      return NextResponse.json({ error: `The limit cannot be lower than the ${tableCount} existing QR tables.` }, { status: 400 });
  }

  if (data.starNumber !== undefined && data.starNumber !== null) {
    const taken = await prisma.business.findFirst({
      where: { starNumber: data.starNumber, id: { not: business.id } },
      select: { name: true },
    });
    if (taken)
      return NextResponse.json({ error: `Star #${data.starNumber} is already assigned to ${taken.name}.` }, { status: 409 });
  }

  const businessUpdate: z.infer<typeof patchSchema> = { ...data };
  // Restaurant-scoped profile fields live on the ORDER profile when one exists,
  // otherwise directly on the Business row.
  const restaurantUpdate: Record<string, unknown> = {};

  if (data.name !== undefined) {
    if (restaurant) restaurantUpdate.name = data.name;
    businessUpdate.name = data.name;
  }
  if (data.phone !== undefined) {
    if (restaurant) restaurantUpdate.phone = data.phone;
    else businessUpdate.phone = data.phone;
  }
  if (data.address !== undefined) {
    if (restaurant) restaurantUpdate.address = data.address;
    else businessUpdate.address = data.address;
  }
  if (data.description !== undefined) {
    if (restaurant) restaurantUpdate.description = data.description;
    businessUpdate.description = data.description;
  }
  if (data.tableLimit !== undefined && restaurant) restaurantUpdate.tableLimit = data.tableLimit;
  if (data.bookingsEnabled !== undefined && restaurant) restaurantUpdate.bookingsEnabled = data.bookingsEnabled;
  if (data.brandColor !== undefined) {
    if (restaurant) restaurantUpdate.brandColor = data.brandColor;
    businessUpdate.brandColor = data.brandColor;
  }

  // Star assignment implies plan STAR, and an assignment resets the subscription
  // to an active, never-expiring founding status.
  if (data.starNumber !== undefined && data.starNumber !== null) {
    businessUpdate.plan = "STAR";
    businessUpdate.subscriptionStatus = "ACTIVE";
    businessUpdate.neverExpires = true;
    businessUpdate.subscriptionExpiresAt = null;
    businessUpdate.subscriptionStart = new Date().toISOString();
  }

  // Extend by N days from now (or current future expiry), clearing neverExpires.
  if (data.extendDays !== undefined) {
    const base = business.subscriptionExpiresAt && new Date(business.subscriptionExpiresAt).getTime() > Date.now()
      ? new Date(business.subscriptionExpiresAt)
      : new Date();
    businessUpdate.subscriptionExpiresAt = new Date(base.getTime() + data.extendDays * 86400000).toISOString();
    businessUpdate.neverExpires = false;
    businessUpdate.subscriptionStatus = "ACTIVE";
  }

  if (data.isActive !== undefined) {
    businessUpdate.isActive = data.isActive;
    if (restaurant) restaurantUpdate.isActive = data.isActive;
  }

  // Business-scoped write, applied field-by-field so absent keys stay untouched.
  const write: Record<string, unknown> = {};
  if (data.name !== undefined) write.name = data.name;
  if (data.description !== undefined) write.description = data.description === null ? null : data.description;
  if (!restaurant) {
    if (data.phone !== undefined) write.phone = data.phone === null ? null : data.phone;
    if (data.address !== undefined) write.address = data.address === null ? null : data.address;
    if (data.brandColor !== undefined) write.brandColor = data.brandColor;
  } else if (data.brandColor !== undefined) {
    restaurantUpdate.brandColor = data.brandColor;
  }
  if (data.plan !== undefined) write.plan = data.plan;
  if (data.subscriptionStatus !== undefined) write.subscriptionStatus = data.subscriptionStatus;
  if (data.subscriptionStart !== undefined)
    write.subscriptionStart = data.subscriptionStart === null ? null : new Date(data.subscriptionStart);
  if (data.subscriptionExpiresAt !== undefined)
    write.subscriptionExpiresAt = data.subscriptionExpiresAt === null ? null : new Date(data.subscriptionExpiresAt);
  if (data.neverExpires !== undefined) write.neverExpires = data.neverExpires;
  if (data.autoOff !== undefined) write.autoOff = data.autoOff;
  if (data.starNumber !== undefined) write.starNumber = data.starNumber === null ? null : data.starNumber;
  if (data.starNote !== undefined) write.starNote = data.starNote === null ? null : data.starNote;
  if (data.isActive !== undefined) write.isActive = data.isActive;

  await prisma.$transaction([
    ...(restaurant && Object.keys(restaurantUpdate).length > 0
      ? [prisma.restaurant.update({ where: { id: restaurant.id }, data: restaurantUpdate })]
      : []),
    prisma.business.update({
      where: { id: business.id },
      data: write,
    }),
    // Product activation upserts
    ...(data.products && data.products.length > 0
      ? data.products.map((p) =>
          prisma.businessProduct.upsert({
            where: { businessId_productId: { businessId: business.id, productId: p.productId } },
            update: { isActive: p.isActive },
            create: { businessId: business.id, productId: p.productId, isActive: p.isActive },
            select: { id: true },
          })
        )
      : []),
  ]);

  // Audit trail
  const activities: { action: string; detail: string }[] = [];
  const onOf = (v?: boolean, on?: string, off?: string) =>
    v === undefined ? [] : [{ action: v ? (on ?? "") : (off ?? ""), detail: "" }];
  activities.push(...onOf(data.isActive, "business_activated", "business_deactivated"));
  if (data.plan !== undefined && data.plan !== business.plan)
    activities.push({ action: "plan_changed", detail: `${business.plan} → ${data.plan}` });
  if (data.starNumber !== undefined) {
    if (data.starNumber !== null) activities.push({ action: "star_assigned", detail: `Star #${data.starNumber}` });
    else if (business.starNumber !== null) activities.push({ action: "star_removed", detail: `Star #${business.starNumber} removed` });
  }
  if (data.extendDays !== undefined)
    activities.push({ action: "subscription_changed", detail: `Extended by ${data.extendDays} day(s)` });
  if (data.subscriptionExpiresAt !== undefined)
    activities.push({ action: "subscription_changed", detail: `Expiry set to ${data.subscriptionExpiresAt === null ? "none" : data.subscriptionExpiresAt}` });
  if (data.neverExpires !== undefined)
    activities.push({ action: "subscription_changed", detail: data.neverExpires ? "Never-expires enabled" : "Never-expires disabled" });
  if (data.autoOff !== undefined)
    activities.push({ action: "subscription_changed", detail: data.autoOff ? "Auto-off enabled" : "Auto-off disabled" });
  if (data.tableLimit !== undefined)
    activities.push({ action: "limit_changed", detail: `QR table limit → ${data.tableLimit}` });
  if (data.bookingsEnabled !== undefined)
    activities.push({ action: data.bookingsEnabled ? "bookings_enabled" : "bookings_disabled", detail: "" });
  if (data.products && data.products.length > 0) {
    const toggled = data.products.filter((p) =>
      !business.products.some((row) => row.productId === p.productId && row.isActive === p.isActive)
    );
    if (toggled.length > 0)
      activities.push({
        action: "products_changed",
        detail: toggled.map((p) => `${p.productId} ${p.isActive ? "ON" : "OFF"}`).join(", "),
      });
  }

  for (const { action, detail } of activities) {
    await logActivity(action, { businessId: business.id, businessName: business.name, detail: detail || undefined });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ businessId: string }> }
) {
  if (!(await isSuperAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { businessId } = await params;
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { name: true, restaurant: { select: { id: true } } },
  });
  if (!business) return NextResponse.json({ error: "Business not found" }, { status: 404 });

  try {
    // OrderItem rows reference MenuItem / MenuItemVariant without ON DELETE
    // (order history must survive menu edits), so the cascade from
    // Restaurant -> MenuItem is otherwise blocked. Clear the order items first,
    // then drop the whole tenant (everything else cascades off the Business).
    await prisma.$transaction([
      ...(business.restaurant
        ? [
            prisma.orderItem.deleteMany({ where: { menuItem: { restaurantId: business.restaurant.id } } }),
            prisma.orderSequence.deleteMany({ where: { restaurantId: business.restaurant.id } }),
          ]
        : []),
      prisma.business.delete({ where: { id: businessId } }),
    ]);
    await logActivity("business_deleted", { businessId, businessName: business.name });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Business Delete Error]:", error);
    return NextResponse.json({ error: "Failed to delete business: " + (error as Error).message }, { status: 500 });
  }
}