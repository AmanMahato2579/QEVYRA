import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";
import { BusinessType } from "@prisma/client";
import bcrypt from "bcryptjs";
import { slugify } from "@/lib/utils";
import { getPlatformSettings } from "@/lib/settings";
import { logActivity } from "@/lib/activity";
import { findPackage } from "@/lib/packages";

const schema = z.object({
  name: z.string().min(2),
  ownerName: z.string().min(1),
  ownerEmail: z.string().email(),
  tempPassword: z.string().min(6),
  tableCount: z.number().int().min(0).max(200).optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  description: z.string().optional(),
  businessType: z.nativeEnum(BusinessType).optional(),
  plan: z.enum(["STAR", "SILVER", "BRONZE"]).optional(),
  packageId: z.enum(["website", "website_menu", "restaurant", "track"]).optional(),
  durationDays: z.number().int().min(1).max(3650).optional(),
  publishWebsite: z.boolean().optional(),
  starNumber: z.number().int().min(1).max(10).nullable().optional(),
});

async function isSuperAdmin() {
  const session = await auth();
  return (session?.user as { role?: string })?.role === "SUPER_ADMIN";
}

export async function POST(req: Request) {
  if (!(await isSuperAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const {
    name,
    ownerName,
    ownerEmail,
    tempPassword,
    phone,
    address,
    description,
    businessType,
    plan,
    packageId,
    durationDays,
    publishWebsite,
    starNumber,
  } = parsed.data;
  const settings = await getPlatformSettings();
  const tableCount = parsed.data.tableCount ?? settings.defaultTableLimit;

  if (starNumber && plan && plan !== "STAR") {
    return NextResponse.json({ error: "A business with a star number must be on the STAR plan." }, { status: 400 });
  }
  if (starNumber) {
    const taken = await prisma.business.findFirst({ where: { starNumber } });
    if (taken) return NextResponse.json({ error: `Star #${starNumber} is already assigned to ${taken.name}.` }, { status: 409 });
  }

  const pkg = findPackage(packageId);
  const isStar = starNumber != null;
  // Precedence: a star number is always STAR; an explicit plan overrides the
  // package default; otherwise the package decides; legacy default is STAR.
  const effectivePlan = isStar ? "STAR" : (plan ?? pkg?.plan ?? "STAR");
  // Only apply package overrides when the caller picked a package (and didn't
  // hand-pick a higher plan that should stay unrestricted).
  const featureOverrides =
    pkg && !isStar && !parsed.data.plan
      ? JSON.stringify(Object.fromEntries(pkg.featureOff.map((key) => [key, false])))
      : null;

  const expiry =
    settings.newRestaurantNeverExpires || isStar
      ? null
      : new Date(Date.now() + (durationDays ?? pkg?.defaultDays ?? settings.defaultSubscriptionDays) * 86400000);

  // Generate unique slug (Business owns the platform-wide slug)
  let slug = slugify(name);
  const existing = await prisma.business.findUnique({ where: { slug } });
  if (existing) slug = `${slug}-${Date.now().toString(36)}`;

  const passwordHash = await bcrypt.hash(tempPassword, 12);

  // Create Business (universal tenant, owns the subscription) + linked
  // Restaurant (ORDER-module profile) + owner + tables in one transaction.
  const result = await prisma.$transaction(async (tx) => {
    const business = await tx.business.create({
      data: {
        name,
        slug,
        type: businessType ?? BusinessType.RESTAURANT,
        description: description ?? null,
        phone,
        address,
        plan: effectivePlan,
        starNumber,
        featureOverrides,
        subscriptionStatus: "ACTIVE",
        subscriptionStart: new Date(),
        subscriptionExpiresAt: expiry,
        neverExpires: isStar || settings.newRestaurantNeverExpires,
        autoOff: settings.newRestaurantAutoOff,
        isActive: true,
      },
    });

    // Every business gets a Website on day one so the universal template
    // + editor are immediately available (theme presets come from the seed).
    // `publishWebsite` flips it live when the offer includes it.
    const defaultTheme = await tx.websiteTheme.findFirst({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });
    await tx.website.upsert({
      where: { businessId: business.id },
      update: {},
      create: {
        businessId: business.id,
        themeId: defaultTheme?.id,
        heroTitle: name,
        heroSubtitle: description ?? undefined,
        aboutText: description ?? undefined,
        metaDescription: description ?? undefined,
        isPublished: publishWebsite ?? false,
      },
    });

    const restaurant = await tx.restaurant.create({
      data: {
        name,
        slug,
        phone,
        address,
        tableLimit: tableCount,
        businessId: business.id,
        isActive: true,
      },
    });

    const user = await tx.user.create({
      data: {
        name: ownerName,
        email: ownerEmail,
        passwordHash,
        role: "RESTAURANT_ADMIN",
        restaurantId: restaurant.id,
        businessId: business.id,
      },
    });

    // Create tables
    if (tableCount > 0) {
      await tx.table.createMany({
        data: Array.from({ length: tableCount }, (_, i) => ({
          restaurantId: restaurant.id,
          tableNumber: i + 1,
        })),
      });
    }

    return { restaurant, user };
  });

  await logActivity("restaurant_created", {
    restaurantId: result.restaurant.id,
    restaurantName: result.restaurant.name,
    detail: isStar
      ? `Star founding assignment #${starNumber}`
      : `Plan: ${effectivePlan}${pkg ? ` · ${pkg.name}` : ""}${publishWebsite ? " · website live" : ""}`,
  });
  if (isStar) {
    await logActivity("star_assigned", {
      restaurantId: result.restaurant.id,
      restaurantName: result.restaurant.name,
      detail: `Star #${starNumber}`,
    });
  }

  // Never return the owner's password hash.
  const owner = {
    id: result.user.id,
    name: result.user.name,
    email: result.user.email,
    role: result.user.role,
    businessId: result.user.businessId,
    restaurantId: result.user.restaurantId,
  };
  return NextResponse.json(
    { restaurant: result.restaurant, user: owner, websitePublished: publishWebsite ?? false },
    { status: 201 },
  );
}