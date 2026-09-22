import { PrismaClient, BusinessType, BookableServiceType } from "@prisma/client";
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

  // ── Demo restaurant bookings: enable + a bookable "dine-in table" ─────────
  if (restaurant?.businessId) {
    if (!restaurant.bookingsEnabled) {
      await prisma.restaurant.update({ where: { id: restaurant.id }, data: { bookingsEnabled: true } });
    }
    const demoServiceCount = await prisma.bookableService.count({ where: { restaurantId: restaurant.id } });
    if (demoServiceCount === 0) {
      await prisma.bookableService.create({
        data: {
          restaurantId: restaurant.id,
          name: "Dine-in Table",
          type: BookableServiceType.OTHER,
          description: "Reserve a table at Demo Momo House",
          price: 0,
          capacity: 6,
          venueCount: 6,
          slotDurationMinutes: 60,
          openingMinutes: 480,
          closingMinutes: 1380,
          sortOrder: 1,
        },
      });
    } else {
      await prisma.bookableService.updateMany({
        where: { restaurantId: restaurant.id, name: "Dine-in Table" },
        data: { venueCount: 6, capacity: 6 },
      });
    }
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

  // ── Demo tickets for the MOMO workflow ────────────────────────────────────
  if (restaurant?.businessId) {
    const momoWorkflow = await prisma.workflow.findFirst({
      where: { businessId: restaurant.businessId, codePrefix: "MOMO" },
      include: { steps: { orderBy: { sortOrder: "asc" } } },
    });

    const t1 = await prisma.ticket.findUnique({ where: { trackingCode: "MOMO-0001" } });
    if (momoWorkflow && !t1) {
      const steps = momoWorkflow.steps;
      await prisma.$transaction(async (tx) => {
        const ticket = await tx.ticket.create({
          data: {
            businessId: momoWorkflow.businessId,
            workflowId: momoWorkflow.id,
            ticketNumber: 1,
            trackingCode: "MOMO-0001",
            customerName: "Hari KC",
            customerPhone: "+977-9812345678",
            itemSummary: "Catering — 100 chicken momo + 40 chili momo for an office event",
            status: "IN_PROGRESS",
            currentStepId: steps[1]?.id ?? null,
            statusChangedAt: new Date(),
            notes: "Deliver by 5 PM",
          },
        });
        await tx.ticketStatusHistory.create({ data: { ticketId: ticket.id, toStatus: "PLACED", note: "Ticket placed" } });
        await tx.ticketStatusHistory.create({
          data: {
            ticketId: ticket.id,
            fromStatus: "PLACED",
            toStatus: "IN_PROGRESS",
            toStepId: steps[0]?.id ?? null,
            note: "Advanced to next step",
          },
        });
      });
      console.log("Seeded demo ticket MOMO-0001.");
    }

    const t2 = await prisma.ticket.findUnique({ where: { trackingCode: "MOMO-0002" } });
    if (momoWorkflow && !t2) {
      await prisma.$transaction(async (tx) => {
        const ticket = await tx.ticket.create({
          data: {
            businessId: momoWorkflow.businessId,
            workflowId: momoWorkflow.id,
            ticketNumber: 2,
            trackingCode: "MOMO-0002",
            customerName: "Punam Shrestha",
            customerPhone: "+977-9840000000",
            itemSummary: "Buff momo platter for a birthday party",
            status: "PLACED",
          },
        });
        await tx.ticketStatusHistory.create({ data: { ticketId: ticket.id, toStatus: "PLACED", note: "Ticket placed" } });
      });
      console.log("Seeded demo ticket MOMO-0002.");
    }
  }

  // ── Track-only demo business (Website + Track, no ORDER profile) ──────────
  // Proves the universal tenant: a service business with a website and job
  // tracking but no restaurant / menu at all.
  const sitaSlug = "sitas-tailoring";
  let sita = await prisma.business.findUnique({ where: { slug: sitaSlug } });
  if (!sita) {
    sita = await prisma.business.create({
      data: {
        name: "Sita's Tailoring",
        slug: sitaSlug,
        type: "SERVICE",
        description: "Custom tailoring, alterations & stitching",
        phone: "+977-9822222222",
        whatsapp: "+977-9822222222",
        address: "Baneshwor, Kathmandu",
        plan: "STAR",
        starNumber: 2,
        subscriptionStatus: "ACTIVE",
        subscriptionStart: new Date(),
        neverExpires: true,
        autoOff: true,
        brandColor: "purple",
      },
    });

    await prisma.website.upsert({
      where: { businessId: sita.id },
      update: {},
      create: {
        businessId: sita.id,
        themeId: "theme-royal",
        isPublished: true,
        metaTitle: "Sita's Tailoring — Custom Stitching",
        metaDescription: "Made-to-measure suits, alterations and stitching with live job tracking.",
        heroTitle: "Sita's Tailoring",
        heroSubtitle: "Made-to-measure suits and alterations, with live job tracking.",
        heroCtaLabel: "Track your order",
        heroCtaLink: "/track?business=sitas-tailoring",
        aboutTitle: "About us",
        aboutText: "Three generations of master tailors. Bring your fabric or pick from our collection — every job is tracked from measurement to pickup.",
        servicesTitle: "What we do",
        servicesText: "Bespoke suits, shirts, kurtas and alterations. Every job gets a tracking code you can follow on your phone.",
        contactPhone: "+977-9822222222",
        contactEmail: "hello@sitastailoring.com",
        footerText: "Sita's Tailoring © 2026",
      },
    });

    const workflow = await prisma.workflow.create({
      data: {
        businessId: sita.id,
        name: "Garment stitching",
        description: "From measurement to pickup",
        codePrefix: "FIT",
      },
    });
    await prisma.workflowStep.createMany({
      data: [
        { workflowId: workflow.id, name: "Order received", sortOrder: 1 },
        { workflowId: workflow.id, name: "Measuring & fitting", sortOrder: 2 },
        { workflowId: workflow.id, name: "Stitching", sortOrder: 3 },
        { workflowId: workflow.id, name: "Ready for pickup", sortOrder: 4, isReadyStep: true },
      ],
    });

    const steps = await prisma.workflowStep.findMany({ where: { workflowId: workflow.id }, orderBy: { sortOrder: "asc" } });
    await prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.create({
        data: {
          businessId: sita!.id,
          workflowId: workflow.id,
          ticketNumber: 1,
          trackingCode: "FIT-0001",
          customerName: "Kabita Gurung",
          customerPhone: "+977-9861234567",
          itemSummary: "2 jackets + 1 trouser, navy suiting fabric",
          status: "IN_PROGRESS",
          currentStepId: steps[2]?.id ?? null,
          statusChangedAt: new Date(),
        },
      });
      await tx.ticketStatusHistory.create({ data: { ticketId: ticket.id, toStatus: "PLACED", note: "Ticket placed" } });
      await tx.ticketStatusHistory.create({
        data: {
          ticketId: ticket.id,
          fromStatus: "PLACED",
          toStatus: "IN_PROGRESS",
          toStepId: steps[0]?.id ?? null,
          note: "Advanced to next step",
        },
      });
      await tx.ticketStatusHistory.create({
        data: {
          ticketId: ticket.id,
          fromStatus: "IN_PROGRESS",
          toStatus: "IN_PROGRESS",
          fromStepId: steps[0]?.id ?? null,
          toStepId: steps[1]?.id ?? null,
          note: "Advanced to next step",
        },
      });
    });
    console.log("Created Sita's Tailoring (Website + Track demo).");
  }

  // The tailor demo needs its own Track admin + staff accounts to log in.
  for (const acc of [
    { email: "owner@tailor.com", name: "Sita Gurung" },
    { email: "staff@tailor.com", name: "Ramesh Shrestha" },
  ]) {
    const existing = await prisma.user.findUnique({ where: { email: acc.email } });
    if (!existing) {
      await prisma.user.create({
        data: {
          email: acc.email,
          name: acc.name,
          passwordHash: await bcrypt.hash("Qevyra@123!", 10),
          role: "TRACKING_ADMIN",
          businessId: sita!.id,
        },
      });
    }
  }
  if (sita) {
    await prisma.user.updateMany({ where: { businessId: sita.id }, data: { role: "TRACKING_ADMIN" } });
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

  // ── Service-line demo businesses (Website + Track / Book) ────────────────
  // One business per business line so the super admin can plan expansion:
  // homestay (bookable rooms), dry cleaning, garage, cleaning, repair.
  // Each has an owner + a staff ("worker") login. Password for all: Qevyra@123!
  const SEED_PASSWORD = "Qevyra@123!";
  const seedHash = await bcrypt.hash(SEED_PASSWORD, 10);

  type TrackBizDef = {
    slug: string;
    name: string;
    type: BusinessType;
    description: string;
    phone: string;
    whatsapp: string;
    address: string;
    star: number;
    brandColor: string;
    themeId: string;
    ownerName: string;
    ownerEmail: string;
    staffName: string;
    staffEmail: string;
    website: { metaTitle: string; metaDescription: string; heroTitle: string; heroSubtitle: string; heroCtaLabel: string; heroCtaLink: string; aboutText: string; servicesText: string; contactPhone: string; contactEmail: string; footerText: string };
    workflow: { name: string; description: string; codePrefix: string; steps: { name: string; isReadyStep?: boolean }[] };
    ticket: { code: string; customerName: string; customerPhone: string; itemSummary: string; status: "IN_PROGRESS" | "READY"; currentStep: number; notes?: string };
  };

  const trackBizs: TrackBizDef[] = [
    {
      slug: "kathmandu-dry-clean",
      name: "Kathmandu Laundry & Dry Clean",
      type: BusinessType.DRY_CLEANING,
      description: "Laundry, dry cleaning & press — tracked till pickup",
      phone: "+977-9833333333",
      whatsapp: "+977-9833333333",
      address: "Jhamsikhel, Lalitpur",
      star: 4,
      brandColor: "blue",
      themeId: "theme-teal",
      ownerName: "Anita Shakya",
      ownerEmail: "owner@dryclean.com",
      staffName: "Binod Tamang",
      staffEmail: "staff@dryclean.com",
      website: {
        metaTitle: "Kathmandu Laundry & Dry Clean — Tracked Care",
        metaDescription: "Same-week laundry & dry cleaning with live job tracking from wash to pickup.",
        heroTitle: "Kathmandu Laundry & Dry Clean",
        heroSubtitle: "Drop your clothes, track every step from wash to pickup.",
        heroCtaLabel: "Track your order",
        heroCtaLink: "/track?business=kathmandu-dry-clean",
        aboutText: "Eco-friendly detergents, careful pressing and live job tracking for every order.",
        servicesText: "Wash & fold, dry cleaning, ironing and curtains — every order gets a tracking code you can follow on your phone.",
        contactPhone: "+977-9833333333",
        contactEmail: "hello@kathmandudryclean.com",
        footerText: "Kathmandu Laundry & Dry Clean © 2026",
      },
      workflow: {
        name: "Cleaning & pressing",
        description: "From drop-off to pickup",
        codePrefix: "DRY",
        steps: [
          { name: "Order received" },
          { name: "Washing & cleaning" },
          { name: "Ironing & folding" },
          { name: "Ready for pickup", isReadyStep: true },
        ],
      },
      ticket: {
        code: "DRY-0001",
        customerName: "Nisha Maharjan",
        customerPhone: "+977-9811112222",
        itemSummary: "3 shirts, 2 trousers, 1 winter coat — dry clean",
        status: "IN_PROGRESS",
        currentStep: 1,
        notes: "Collect by Saturday",
      },
    },
    {
      slug: "rapid-motor-garage",
      name: "Rapid Motor Garage & Showroom",
      type: BusinessType.GARAGE,
      description: "Bike & car servicing with live job tracking",
      phone: "+977-9844444444",
      whatsapp: "+977-9844444444",
      address: "Balkumari, Lalitpur",
      star: 5,
      brandColor: "amber",
      themeId: "theme-orange",
      ownerName: "Rajesh Malla",
      ownerEmail: "owner@motorgarage.com",
      staffName: "Suresh Rai",
      staffEmail: "staff@motorgarage.com",
      website: {
        metaTitle: "Rapid Motor Garage & Showroom — Servicing",
        metaDescription: "Bike and car servicing with live job tracking, plus a small spares showroom.",
        heroTitle: "Rapid Motor Garage & Showroom",
        heroSubtitle: "Bring your vehicle and follow it through every step of the workshop.",
        heroCtaLabel: "Track your service",
        heroCtaLink: "/track?business=rapid-motor-garage",
        aboutText: "Family-run workshop for bikes and cars — honest diagnosis, fair prices, live tracking.",
        servicesText: "General servicing, brakes, suspension, oil change and spares — every job tracked from the moment it enters the workshop.",
        contactPhone: "+977-9844444444",
        contactEmail: "hello@rapidmotorgarage.com",
        footerText: "Rapid Motor Garage & Showroom © 2026",
      },
      workflow: {
        name: "Vehicle servicing",
        description: "From the front desk to the road",
        codePrefix: "MOT",
        steps: [
          { name: "Job registered" },
          { name: "Diagnosis" },
          { name: "Parts & repair" },
          { name: "Ready for pickup", isReadyStep: true },
        ],
      },
      ticket: {
        code: "MOT-0001",
        customerName: "Kiran Bhattarai",
        customerPhone: "+977-9845556666",
        itemSummary: "Honda Dio — full service + brake pads",
        status: "IN_PROGRESS",
        currentStep: 2,
        notes: "Call before pickup",
      },
    },
    {
      slug: "sparkle-home-cleaning",
      name: "Sparkle Home Cleaning",
      type: BusinessType.CLEANING,
      description: "Home & office cleaning, tracked from request to done",
      phone: "+977-9855555555",
      whatsapp: "+977-9855555555",
      address: "Boudha, Kathmandu",
      star: 6,
      brandColor: "emerald",
      themeId: "theme-teal",
      ownerName: "Mina Pradhan",
      ownerEmail: "owner@cleaning.com",
      staffName: "Deepak Shrestha",
      staffEmail: "staff@cleaning.com",
      website: {
        metaTitle: "Sparkle Home Cleaning — Trusted Cleaners",
        metaDescription: "Home and office cleaning with a live job tracker so you know exactly when the crew arrives.",
        heroTitle: "Sparkle Home Cleaning",
        heroSubtitle: "Let our crew handle it — follow your job through every step to done.",
        heroCtaLabel: "Track your cleaning",
        heroCtaLink: "/track?business=sparkle-home-cleaning",
        aboutText: "Vetted, insured cleaners for homes and offices across the valley.",
        servicesText: "Deep cleaning, regular maintenance, office cleaning and post-renovation clean-ups — each job tracked by code.",
        contactPhone: "+977-9855555555",
        contactEmail: "hello@sparklecleaning.com",
        footerText: "Sparkle Home Cleaning © 2026",
      },
      workflow: {
        name: "Cleaning job",
        description: "From request to sparkling",
        codePrefix: "SPK",
        steps: [
          { name: "Request received" },
          { name: "Crew assigned" },
          { name: "Cleaning in progress" },
          { name: "Job completed", isReadyStep: true },
        ],
      },
      ticket: {
        code: "SPK-0001",
        customerName: "Srijana Karki",
        customerPhone: "+977-9817778888",
        itemSummary: "2BHK apartment deep clean",
        status: "IN_PROGRESS",
        currentStep: 1,
      },
    },
    {
      slug: "nepal-repair-hub",
      name: "NEP Repair Hub",
      type: BusinessType.REPAIR,
      description: "Phones, laptops & home electronics repair, tracked",
      phone: "+977-9866666666",
      whatsapp: "+977-9866666666",
      address: "New Road, Kathmandu",
      star: 7,
      brandColor: "violet",
      themeId: "theme-royal",
      ownerName: "Prabin Acharya",
      ownerEmail: "owner@repairhub.com",
      staffName: "Ramesh Thapa",
      staffEmail: "staff@repairhub.com",
      website: {
        metaTitle: "NEP Repair Hub — Phone & Electronics Repair",
        metaDescription: "Phones, laptops and home electronics repair with transparent live tracking.",
        heroTitle: "NEP Repair Hub",
        heroSubtitle: "Drop your device, get a tracking code, follow the repair in real time.",
        heroCtaLabel: "Track your repair",
        heroCtaLink: "/track?business=nepal-repair-hub",
        aboutText: "Certified technicians for phones, laptops and home electronics — with honest pricing and a 30-day warranty.",
        servicesText: "Screen replacement, battery service, motherboard repair, data recovery and more — every device tracked from arrival to pickup.",
        contactPhone: "+977-9866666666",
        contactEmail: "hello@nepalrepairhub.com",
        footerText: "NEP Repair Hub © 2026",
      },
      workflow: {
        name: "Device repair",
        description: "From drop-off to pickup",
        codePrefix: "RPX",
        steps: [
          { name: "Device received" },
          { name: "Diagnosis" },
          { name: "Repairing" },
          { name: "Ready for pickup", isReadyStep: true },
        ],
      },
      ticket: {
        code: "RPX-0001",
        customerName: "Ujjwal Joshi",
        customerPhone: "+977-9841112222",
        itemSummary: "Samsung phone — battery replacement",
        status: "READY",
        currentStep: 3,
      },
    },
  ];

  for (const def of trackBizs) {
    let biz = await prisma.business.findUnique({ where: { slug: def.slug } });
    const created = !biz;
    if (!biz) {
      biz = await prisma.business.create({
        data: {
          name: def.name,
          slug: def.slug,
          type: def.type,
          description: def.description,
          phone: def.phone,
          whatsapp: def.whatsapp,
          address: def.address,
          plan: "STAR",
          starNumber: def.star,
          subscriptionStatus: "ACTIVE",
          subscriptionStart: new Date(),
          neverExpires: true,
          autoOff: true,
          brandColor: def.brandColor,
        },
      });
    } else if (biz.type !== def.type) {
      await prisma.business.update({ where: { id: biz.id }, data: { type: def.type } });
    }

    if (!biz) throw new Error(`Unable to create or load ${def.slug}.`);

    await prisma.website.upsert({
      where: { businessId: biz.id },
      update: { isPublished: true },
      create: {
        businessId: biz.id,
        themeId: def.themeId,
        isPublished: true,
        metaTitle: def.website.metaTitle,
        metaDescription: def.website.metaDescription,
        heroTitle: def.website.heroTitle,
        heroSubtitle: def.website.heroSubtitle,
        heroCtaLabel: def.website.heroCtaLabel,
        heroCtaLink: def.website.heroCtaLink,
        aboutTitle: "About us",
        aboutText: def.website.aboutText,
        servicesTitle: "What we do",
        servicesText: def.website.servicesText,
        contactPhone: def.website.contactPhone,
        contactEmail: def.website.contactEmail,
        footerText: def.website.footerText,
      },
    });

// Service businesses are Track-SaaS tenants only: they get NO Restaurant
    // row and NO online booking service. Idempotently remove anything that was
    // seeded earlier so their website never shows a booking CTA.
    const serviceBookerSlugs = [
      "kathmandu-dry-clean",
      "rapid-motor-garage",
      "sparkle-home-cleaning",
      "nepal-repair-hub",
    ];
    for (const bookerSlug of serviceBookerSlugs) {
      const bookerRestaurant = await prisma.restaurant.findUnique({ where: { slug: bookerSlug } });
      if (!bookerRestaurant) continue;
      await prisma.$transaction([
        prisma.booking.deleteMany({ where: { service: { restaurantId: bookerRestaurant.id } } }),
        prisma.bookableService.deleteMany({ where: { restaurantId: bookerRestaurant.id } }),
        prisma.restaurant.delete({ where: { id: bookerRestaurant.id } }),
      ]);
    }

    for (const acc of [
      { email: def.ownerEmail, name: def.ownerName },
      { email: def.staffEmail, name: def.staffName },
    ]) {
      const existing = await prisma.user.findUnique({ where: { email: acc.email } });
      if (!existing) {
        await prisma.user.create({
          data: { email: acc.email, name: acc.name, passwordHash: seedHash, role: "TRACKING_ADMIN", businessId: biz.id },
        });
      }
    }

    // Track-saaS tenants always carry the TRACKING_ADMIN role — including any
    // pre-existing accounts (e.g. the tailor demo) that were created earlier
    // with the shared restaurant role.
    await prisma.user.updateMany({
      where: { businessId: biz.id },
      data: { role: "TRACKING_ADMIN" },
    });

    const existingWorkflow = await prisma.workflow.findFirst({
      where: { businessId: biz.id, codePrefix: def.workflow.codePrefix },
    });
    if (!existingWorkflow) {
      const workflow = await prisma.workflow.create({
        data: {
          businessId: biz.id,
          name: def.workflow.name,
          description: def.workflow.description,
          codePrefix: def.workflow.codePrefix,
        },
      });
      await prisma.workflowStep.createMany({
        data: def.workflow.steps.map((s, i) => ({
          workflowId: workflow.id,
          name: s.name,
          sortOrder: i + 1,
          isReadyStep: s.isReadyStep ?? false,
        })),
      });
    }

    const workflow = await prisma.workflow.findFirst({
      where: { businessId: biz.id, codePrefix: def.workflow.codePrefix },
      include: { steps: { orderBy: { sortOrder: "asc" } } },
    });
    const ticketExists = await prisma.ticket.findUnique({ where: { trackingCode: def.ticket.code } });
    if (workflow && !ticketExists) {
      const steps = workflow.steps;
      const currentStep = steps[def.ticket.currentStep] ?? null;
      await prisma.$transaction(async (tx) => {
        const ticket = await tx.ticket.create({
          data: {
            businessId: biz!.id,
            workflowId: workflow.id,
            ticketNumber: 1,
            trackingCode: def.ticket.code,
            customerName: def.ticket.customerName,
            customerPhone: def.ticket.customerPhone,
            itemSummary: def.ticket.itemSummary,
            status: def.ticket.status,
            currentStepId: currentStep?.id ?? null,
            statusChangedAt: new Date(),
            notes: def.ticket.notes ?? null,
            completedAt: def.ticket.status === "READY" ? new Date() : null,
          },
        });
        await tx.ticketStatusHistory.create({ data: { ticketId: ticket.id, toStatus: "PLACED", note: "Ticket placed" } });
        if (def.ticket.status === "IN_PROGRESS" || def.ticket.status === "READY") {
          await tx.ticketStatusHistory.create({
            data: {
              ticketId: ticket.id,
              fromStatus: "PLACED",
              toStatus: "IN_PROGRESS",
              toStepId: steps[0]?.id ?? null,
              note: "Advanced to next step",
            },
          });
          const stepIdx = steps.findIndex((s) => s.id === currentStep?.id);
          if (stepIdx >= 1) {
            await tx.ticketStatusHistory.create({
              data: {
                ticketId: ticket.id,
                fromStatus: "IN_PROGRESS",
                toStatus: currentStep?.isReadyStep ? "READY" : "IN_PROGRESS",
                fromStepId: steps[stepIdx - 1]?.id ?? null,
                toStepId: currentStep?.id ?? null,
                note: "Advanced to next step",
              },
            });
          }
        }
      });
    }

    console.log(`${created ? "Created" : "Ensured"} ${def.name} (${def.type}) with owner + staff + track workflow.`);
  }

  // ── Homestay demo business (Booking line) ────────────────────────────────
  const homeStaySlug = "gorkha-homestay";
  let homeBiz = await prisma.business.findUnique({ where: { slug: homeStaySlug } });
  const homeCreated = !homeBiz;
  if (!homeBiz) {
    homeBiz = await prisma.business.create({
      data: {
        name: "Gorkha Hills Homestay",
        slug: homeStaySlug,
        type: BusinessType.HOMESTAY,
        description: "Mountain-view rooms with breakfast, just outside the city",
        phone: "+977-9812341111",
        whatsapp: "+977-9812341111",
        address: "Machhegaun, Kathmandu",
        plan: "STAR",
        starNumber: 3,
        subscriptionStatus: "ACTIVE",
        subscriptionStart: new Date(),
        neverExpires: true,
        autoOff: true,
        brandColor: "teal",
      },
    });
  } else if (homeBiz.type !== BusinessType.HOMESTAY) {
    await prisma.business.update({ where: { id: homeBiz.id }, data: { type: BusinessType.HOMESTAY } });
  }

  if (!homeBiz) throw new Error("Unable to create or load the homestay business.");

  await prisma.website.upsert({
    where: { businessId: homeBiz.id },
    update: { isPublished: true },
    create: {
      businessId: homeBiz.id,
      themeId: "theme-teal",
      isPublished: true,
      metaTitle: "Gorkha Hills Homestay — Book a Room",
      metaDescription: "Mountain-view rooms in Gorkha Hills with breakfast — book online in seconds.",
      heroTitle: "Gorkha Hills Homestay",
      heroSubtitle: "A quiet mountain-view room with breakfast — book online in seconds.",
      heroCtaLabel: "Book a Room",
      heroCtaLink: "/r/gorkha-homestay/book",
      aboutTitle: "About us",
      aboutText: "A family-run homestay with three guest rooms, a garden and home-cooked Nepali meals.",
      servicesTitle: "Rooms & stays",
      servicesText: "Double rooms and a family suite, all with breakfast included.",
      contactPhone: "+977-9812341111",
      contactEmail: "stay@gorkhahills.com",
      footerText: "Gorkha Hills Homestay © 2026",
    },
  });

  for (const acc of [
    { email: "owner@homestay.com", name: "Krishna Gurung" },
    { email: "staff@homestay.com", name: "Sarita Gurung" },
  ]) {
    const existing = await prisma.user.findUnique({ where: { email: acc.email } });
    if (!existing) {
      await prisma.user.create({
        data: { email: acc.email, name: acc.name, passwordHash: seedHash, role: "RESTAURANT_ADMIN", businessId: homeBiz.id },
      });
    }
  }

  let homeRestaurant = await prisma.restaurant.findFirst({ where: { businessId: homeBiz.id } });
  if (!homeRestaurant) {
    homeRestaurant = await prisma.restaurant.create({
      data: {
        businessId: homeBiz.id,
        name: "Gorkha Hills Homestay",
        slug: homeStaySlug,
        description: "Mountain-view rooms with breakfast",
        currency: "Rs.",
        bookingsEnabled: true,
        isActive: true,
      },
    });
  } else if (!homeRestaurant.bookingsEnabled) {
    await prisma.restaurant.update({ where: { id: homeRestaurant.id }, data: { bookingsEnabled: true } });
  }

  // Homestay is a menu-kind client: its staff need restaurantId so the QR-menu
  // admin (menu, tables, bookings, orders) resolves correctly.
  await prisma.user.updateMany({
    where: { businessId: homeBiz.id, restaurantId: null },
    data: { restaurantId: homeRestaurant.id },
  });

  const tableCount = await prisma.table.count({ where: { restaurantId: homeRestaurant.id } });
  if (tableCount === 0) {
    await prisma.table.createMany({
      data: [
        { restaurantId: homeRestaurant.id, tableNumber: 1, qrToken: "homestay-desk-1" },
        { restaurantId: homeRestaurant.id, tableNumber: 2, qrToken: "homestay-desk-2" },
      ],
    });
  }

  const roomCount = await prisma.bookableService.count({ where: { restaurantId: homeRestaurant.id } });
  if (roomCount === 0) {
    await prisma.bookableService.createMany({
      data: [
        {
          restaurantId: homeRestaurant.id,
          name: "Standard Room — Double",
          type: BookableServiceType.ROOM,
          description: "Mountain-view double room with attached bathroom and breakfast included",
          price: 2500,
          capacity: 2,
          venueCount: 2,
          slotDurationMinutes: 1440,
          openingMinutes: 0,
          closingMinutes: 1439,
          sortOrder: 1,
        },
        {
          restaurantId: homeRestaurant.id,
          name: "Family Suite",
          type: BookableServiceType.ROOM,
          description: "Two-bedroom suite for a family of four, garden view, breakfast included",
          price: 4800,
          capacity: 4,
          venueCount: 1,
          slotDurationMinutes: 1440,
          openingMinutes: 0,
          closingMinutes: 1439,
          sortOrder: 2,
        },
      ],
    });
  }

  // Ensure the pre-existing tailor demo is typed as a tailor (naming sanity).
  const sitaExisting = await prisma.business.findUnique({ where: { slug: "sitas-tailoring" } });
  if (sitaExisting && sitaExisting.type !== BusinessType.TAILOR) {
    await prisma.business.update({ where: { id: sitaExisting.id }, data: { type: BusinessType.TAILOR } });
  }

  console.log(`${homeCreated ? "Created" : "Ensured"} Gorkha Hills Homestay (HOMESTAY) with bookable rooms + owner + staff.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });