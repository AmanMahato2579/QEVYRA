import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Mirrors the plan catalog seeded by the baseline migration so that a
// `prisma db push` environment (no migrations) still has working plan rows.
// The runtime falls back to built-in defaults when a row is missing anyway.
const DEFAULT_PLANS = [
  {
    id: "BRONZE",
    name: "Bronze",
    description: "Business website & digital menu. View-only — no ordering.",
    featureKeys:
      '["restaurant_profile","digital_menu","menu_management","qr_tables","business_website","business_track"]',
    limitKeys: '{"qrTables":10,"workflows":1}',
    sortOrder: 10,
  },
  {
    id: "SILVER",
    name: "Silver",
    description: "Everything in Bronze, plus QR ordering, table ordering and order management.",
    featureKeys:
      '["restaurant_profile","digital_menu","menu_management","qr_tables","business_website","business_track","ordering","table_ordering","order_management","kitchen_workflow","order_history"]',
    limitKeys: '{"qrTables":20,"workflows":2}',
    sortOrder: 20,
  },
  {
    id: "STAR",
    name: "Star",
    description: "Founding customer. Access to ALL current and future QEVYRA features.",
    featureKeys: '["ALL_CURRENT_FEATURES"]',
    limitKeys: '{"qrTables":50,"workflows":10}',
    sortOrder: 30,
  },
];

async function main() {
  for (const plan of DEFAULT_PLANS) {
    await prisma.plan.upsert({
      where: { id: plan.id },
      update: { isVisible: true, isActive: true },
      create: { ...plan, isVisible: true, isActive: true },
    });
  }

  const defaultThemes = [
    { id: "theme-orange", name: "Ember", description: "Warm orange on deep slate — default", primaryColor: "#f97316", background: "#0b0f19", fontFamily: "inter" },
    { id: "theme-teal", name: "Lagoon", description: "Fresh teal on deep slate", primaryColor: "#14b8a6", background: "#0b0f19", fontFamily: "inter" },
    { id: "theme-royal", name: "Royal", description: "Violet accent for premium brands", primaryColor: "#8b5cf6", background: "#0b0f19", fontFamily: "inter" },
  ];
  for (const theme of defaultThemes) {
    await prisma.websiteTheme.upsert({
      where: { id: theme.id },
      update: {},
      create: theme,
    });
  }

  const superAdminEmail = "admin@qevyra.com";
  const passwordHash = await bcrypt.hash("Admin123!", 10);

  const existingSuperAdmin = await prisma.user.findUnique({
    where: { email: superAdminEmail },
  });

  if (!existingSuperAdmin) {
    await prisma.user.create({
      data: {
        email: superAdminEmail,
        name: "Super Admin",
        passwordHash,
        role: "SUPER_ADMIN",
      },
    });
    console.log(`Created Super Admin: ${superAdminEmail} / Admin123!`);
  }

  // ── Demo business (universal tenant) with a linked ORDER profile ──────────
  const restaurantAdminEmail = "owner@demo.com";
  let restaurant = await prisma.restaurant.findUnique({
    where: { slug: "demo-restaurant" },
  });

  if (!restaurant) {
    const business = await prisma.business.create({
      data: {
        name: "Demo Momo House",
        slug: "demo-restaurant",
        description: "Authentic Nepali Momo & Fast Food",
        phone: "+977-9800000000",
        whatsapp: "+977-9800000000",
        address: "Thamel, Kathmandu",
        plan: "STAR",
        starNumber: 1,
        subscriptionStatus: "ACTIVE",
        subscriptionStart: new Date(),
        neverExpires: true,
        autoOff: true,
      },
    });

    const createdRestaurant = await prisma.restaurant.create({
      data: {
        businessId: business.id,
        name: "Demo Momo House",
        slug: "demo-restaurant",
        description: "Authentic Nepali Momo & Fast Food",
        currency: "Rs.",
        taxRate: 13,
        isTaxEnabled: true,
        serviceChargeRate: 10,
        isServiceChargeEnabled: true,
        isActive: true,
      },
    });

    await prisma.user.create({
      data: {
        email: restaurantAdminEmail,
        name: "Demo Owner",
        passwordHash: await bcrypt.hash("Owner123!", 10),
        role: "RESTAURANT_ADMIN",
        businessId: business.id,
        restaurantId: createdRestaurant.id,
      },
    });

    await prisma.website.upsert({
      where: { businessId: business.id },
      update: {},
      create: {
        businessId: business.id,
        themeId: "theme-orange",
        isPublished: true,
        metaTitle: "Demo Momo House — Thamel, Kathmandu",
        metaDescription: "Authentic Nepali momo & fast food in Thamel.",
        heroTitle: "Demo Momo House",
        heroSubtitle: "Authentic Nepali momo, served fast.",
        heroCtaLabel: "View Menu",
        heroCtaLink: "/r/demo-restaurant/t/demo-table-1",
        aboutTitle: "About us",
        aboutText: "Founded in Thamel, we serve steamed, fried and chili momo made fresh every day.",
        contactPhone: "+977-9800000000",
        contactEmail: "hello@demomomohouse.com",
        footerText: "Demo Momo House © 2026",
      },
    });

    await prisma.table.createMany({
      data: Array.from({ length: 5 }).map((_, i) => ({
        restaurantId: createdRestaurant.id,
        tableNumber: i + 1,
        qrToken: `demo-table-${i + 1}`,
      })),
    });

    restaurant = createdRestaurant;
    console.log("Created demo Business + Restaurant + Website + owner.");
  }

  // ── Demo Track workflow (garage-style tracking) for the demo business ─────
  if (restaurant?.businessId) {
    const existingWorkflow = await prisma.workflow.findFirst({
      where: { businessId: restaurant.businessId, codePrefix: "MOMO" },
    });
    if (!existingWorkflow) {
      const workflow = await prisma.workflow.create({
        data: {
          businessId: restaurant.businessId,
          name: "Momo order prep",
          description: "Tracking preparation of a large catering order",
          codePrefix: "MOMO",
        },
      });
      await prisma.workflowStep.createMany({
        data: [
          { workflowId: workflow.id, name: "Order received", sortOrder: 1 },
          { workflowId: workflow.id, name: "Preparing", sortOrder: 2 },
          { workflowId: workflow.id, name: "Ready for pickup", sortOrder: 3, isReadyStep: true },
          { workflowId: workflow.id, name: "Delivered", sortOrder: 4 },
        ],
      });
    }
  }

  if (!restaurant) throw new Error("Unable to create or load the demo restaurant.");

  // Create Categories & Items if empty
  const catCount = await prisma.category.count({ where: { restaurantId: restaurant.id } });
  if (catCount === 0) {
    const steamCat = await prisma.category.create({
      data: {
        restaurantId: restaurant.id,
        name: "Steam Momo",
        description: "Freshly steamed dumplings served with tomato-sesame chutney",
      },
    });

    const cmomoCat = await prisma.category.create({
      data: {
        restaurantId: restaurant.id,
        name: "Chilly Momo",
        description: "Tossed in spicy capsicum chili garlic gravy",
      },
    });

    const drinksCat = await prisma.category.create({
      data: {
        restaurantId: restaurant.id,
        name: "Beverages",
        description: "Refreshing cold drinks & teas",
      },
    });

    const momoItem = await prisma.menuItem.create({
      data: {
        restaurantId: restaurant.id,
        categoryId: steamCat.id,
        name: "Steamed Momo",
        description: "Traditional Nepali dumplings",
        price: 180,
        ingredients: "Flour, Onion, Ginger, Garlic, Spices",
        hasSpicyOption: true,
        hasNoteOption: true,
      },
    });

    await prisma.menuItemVariant.createMany({
      data: [
        { menuItemId: momoItem.id, name: "Veg", price: 150 },
        { menuItemId: momoItem.id, name: "Chicken", price: 180 },
        { menuItemId: momoItem.id, name: "Buff", price: 170 },
      ],
    });

    const cmomoItem = await prisma.menuItem.create({
      data: {
        restaurantId: restaurant.id,
        categoryId: cmomoCat.id,
        name: "C-Momo Special",
        description: "Pan fried momo tossed in hot chili salsa",
        price: 220,
        ingredients: "Chili Sauce, Onion, Capsicum",
        hasSpicyOption: true,
        hasNoteOption: true,
      },
    });

    await prisma.menuItemVariant.createMany({
      data: [
        { menuItemId: cmomoItem.id, name: "Veg C-Momo", price: 190 },
        { menuItemId: cmomoItem.id, name: "Chicken C-Momo", price: 230 },
      ],
    });

    await prisma.menuItem.create({
      data: {
        restaurantId: restaurant.id,
        categoryId: drinksCat.id,
        name: "Fresh Lemon Soda",
        description: "Sweet and salted lemon soda",
        price: 90,
        hasSpicyOption: false,
        hasNoteOption: true,
      },
    });

    console.log("Seeded menu categories, items, and variants.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });