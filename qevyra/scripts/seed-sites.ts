import { PrismaClient, BusinessType, SiteType } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === "production" || process.env.VERCEL) {
    console.error(
      "Refusing to run sites:seed in production or Vercel environment."
    );
    process.exit(1);
  }

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("host is not local");
    process.exit(1);
  }

  let dbHost = "";
  try {
    const parsed = new URL(dbUrl);
    dbHost = parsed.hostname;
  } catch {
    console.error("host is not local");
    process.exit(1);
  }

  if (dbHost !== "localhost" && dbHost !== "127.0.0.1") {
    console.error("host is not local");
    process.exit(1);
  }

  console.log("Seeding sites module demo data...");

  // 1. Get or create Businesses for the three sites
  // Link demo-menu to demo-restaurant if it exists, demo-tracking to sitas-tailoring if it exists.
  // demo-general links to a minimal business "demo-kirana" with NO user.
  let menuBusiness = await prisma.business.findUnique({
    where: { slug: "demo-restaurant" },
  });
  if (!menuBusiness) {
    menuBusiness = await prisma.business.create({
      data: {
        name: "Demo Momo House",
        slug: "demo-restaurant",
        type: BusinessType.RESTAURANT,
        plan: "STAR",
        subscriptionStatus: "ACTIVE",
        neverExpires: true,
        autoOff: true,
        isActive: true,
      },
    });
  }

  let trackingBusiness = await prisma.business.findUnique({
    where: { slug: "sitas-tailoring" },
  });
  if (!trackingBusiness) {
    trackingBusiness = await prisma.business.create({
      data: {
        name: "Sita's Tailoring",
        slug: "sitas-tailoring",
        type: BusinessType.TAILOR,
        plan: "STAR",
        subscriptionStatus: "ACTIVE",
        neverExpires: true,
        autoOff: true,
        isActive: true,
      },
    });
  }

  let generalBusiness = await prisma.business.findUnique({
    where: { slug: "demo-kirana" },
  });
  if (!generalBusiness) {
    generalBusiness = await prisma.business.create({
      data: {
        name: "Demo Kirana",
        slug: "demo-kirana",
        type: BusinessType.RETAIL,
        plan: "STAR",
        subscriptionStatus: "ACTIVE",
        neverExpires: true,
        autoOff: true,
        isActive: true,
      },
    });
  }

  // 2. Demo Sites Data
  const sitesData = [
    {
      slug: "demo-general",
      businessId: generalBusiness.id,
      type: SiteType.GENERAL,
      name: "Demo Kirana & Essentials",
      shortDescription: "Your neighborhood grocery & essentials store",
      aboutText:
        "Providing fresh groceries, pantry staples, and daily home essentials with quick and reliable local doorstep delivery.",
      storyText:
        "Founded over a decade ago as a family corner shop, we have been serving our community with quality grains, cooking oils, and household goods every single day.",
      logoUrl:
        "https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=160&auto=format&fit=crop&q=80",
      heroImageUrl:
        "https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&auto=format&fit=crop&q=80",
      primaryColor: "#059669",
      phone: "+977-9800000001",
      whatsapp: "+977-9800000001",
      addressText: "Ason Chowk, Kathmandu, Nepal",
      mapUrl: "https://maps.google.com/?q=Ason+Kathmandu",
      openingHours: "Sunday - Saturday: 7:00 AM - 9:00 PM",
      googleReviewUrl: "https://g.page/r/demo-kirana/review",
      socialLinks: [
        { platform: "facebook", url: "https://facebook.com/demokirana" },
        { platform: "instagram", url: "https://instagram.com/demokirana" },
      ],
      isPublished: true,
      enableItems: true,
      enableTrackOrder: false,
      enableAds: true,
      enableBooking: false,
      highlights: [
        {
          title: "Daily Pantry Staples",
          description: "Freshly stocked grains, whole wheat flour, and pure cooking oils.",
          imageUrl:
            "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&auto=format&fit=crop&q=80",
          sortOrder: 1,
        },
        {
          title: "Fast Doorstep Delivery",
          description: "Prompt delivery across the neighborhood within 60 minutes.",
          imageUrl:
            "https://images.unsplash.com/photo-1526367790999-0150786686a2?w=400&auto=format&fit=crop&q=80",
          sortOrder: 2,
        },
      ],
      items: [
        {
          name: "Chakki Fresh Atta (5kg)",
          description: "100% whole wheat stone-ground flour",
          priceText: "Rs. 450",
          category: "Flour & Grains",
          imageUrl:
            "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=200&auto=format&fit=crop&q=80",
          sortOrder: 1,
          isActive: true,
        },
        {
          name: "Pure Mustard Oil (1L)",
          description: "Cold-pressed traditional cooking oil",
          priceText: "Rs. 280",
          category: "Cooking Essentials",
          imageUrl:
            "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=200&auto=format&fit=crop&q=80",
          sortOrder: 2,
          isActive: true,
        },
        {
          name: "Natural Herbal Soap (Pack of 3)",
          description: "Gentle handmade cleansing soap with neem and turmeric",
          priceText: "Rs. 210",
          category: "Household & Care",
          imageUrl:
            "https://images.unsplash.com/photo-1607006314187-54b1f496735e?w=200&auto=format&fit=crop&q=80",
          sortOrder: 3,
          isActive: true,
        },
      ],
    },
    {
      slug: "demo-tracking",
      businessId: trackingBusiness.id,
      type: SiteType.TRACKING,
      name: "Sita's Tailoring & Boutique",
      shortDescription: "Bespoke tailoring, bridal wear & precision alterations",
      aboutText:
        "Master craftspeople delivering custom bridal stitching, designer kurtas, and sharp formal suits with live progress tracking.",
      storyText:
        "Starting with a single sewing machine over 12 years ago, Sita has grown this atelier into a beloved studio known for impeccable fit and finishing.",
      logoUrl:
        "https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=160&auto=format&fit=crop&q=80",
      heroImageUrl:
        "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=800&auto=format&fit=crop&q=80",
      primaryColor: "#7c3aed",
      phone: "+977-9800000002",
      whatsapp: "+977-9800000002",
      addressText: "Patan Dhoka, Lalitpur, Nepal",
      mapUrl: "https://maps.google.com/?q=Patan+Dhoka",
      openingHours: "Sunday - Friday: 9:00 AM - 7:00 PM\nSaturday: Closed",
      googleReviewUrl: "https://g.page/r/sitas-tailoring/review",
      socialLinks: [
        { platform: "instagram", url: "https://instagram.com/sitastailoring" },
      ],
      isPublished: true,
      enableItems: false,
      enableTrackOrder: true,
      enableAds: true,
      enableBooking: true,
      highlights: [
        {
          title: "Bridal & Festive Wear",
          description: "Custom lehengas, blouses, and hand-embroidered festive dresses.",
          imageUrl:
            "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=400&auto=format&fit=crop&q=80",
          sortOrder: 1,
        },
        {
          title: "Precision Alterations",
          description: "Hemming, tapering, and reshaping within 24 to 48 hours.",
          imageUrl:
            "https://images.unsplash.com/photo-1528459801416-a9e53bbf4e17?w=400&auto=format&fit=crop&q=80",
          sortOrder: 2,
        },
      ],
      items: [
        {
          name: "Custom Kurta Stitching",
          description: "Made-to-measure stitching with full lining and piping",
          priceText: "Rs. 1,200",
          category: "Stitching",
          imageUrl: null,
          sortOrder: 1,
          isActive: true,
        },
      ],
    },
    {
      slug: "demo-menu",
      businessId: menuBusiness.id,
      type: SiteType.MENU,
      name: "Demo Momo & Himalayan Kitchen",
      shortDescription: "Handcrafted juicy steamed, kothey & jhol momos",
      aboutText:
        "Experience authentic Himalayan comfort food prepared fresh daily with mountain spices and warmth.",
      storyText:
        "Our journey began in Mustang with a treasured family recipe. We take pride in bringing those pure, homestyle Himalayan flavors directly to your table.",
      logoUrl:
        "https://images.unsplash.com/photo-1552611052-33e04de081de?w=160&auto=format&fit=crop&q=80",
      heroImageUrl:
        "https://images.unsplash.com/photo-1625398407796-82650a8c135f?w=800&auto=format&fit=crop&q=80",
      primaryColor: "#ea580c",
      phone: "+977-9800000003",
      whatsapp: "+977-9800000003",
      addressText: "Thamel Marg, Kathmandu, Nepal",
      mapUrl: "https://maps.google.com/?q=Thamel+Kathmandu",
      openingHours: "Every day: 11:00 AM - 10:00 PM",
      googleReviewUrl: "https://g.page/r/demo-momo/review",
      socialLinks: [
        { platform: "facebook", url: "https://facebook.com/demomomo" },
        { platform: "instagram", url: "https://instagram.com/demomomo" },
      ],
      isPublished: true,
      enableItems: true,
      enableTrackOrder: true,
      enableAds: true,
      enableBooking: true,
      highlights: [
        {
          title: "Steamed Buff Momo",
          description: "Our signature tender buffalo dumplings served with fiery tomato relish.",
          imageUrl:
            "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=400&auto=format&fit=crop&q=80",
          sortOrder: 1,
        },
        {
          title: "Himalayan Jhol Momo",
          description: "Dumplings bathed in warm, spiced sesame-perilla broth.",
          imageUrl:
            "https://images.unsplash.com/photo-1625398407796-82650a8c135f?w=400&auto=format&fit=crop&q=80",
          sortOrder: 2,
        },
      ],
      items: [
        {
          name: "Steamed Buff Momo (10 pcs)",
          description: "Classic steamed buffalo dumplings with yellow soybean-sesame achar",
          priceText: "Rs. 180",
          category: "Momos",
          imageUrl:
            "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=200&auto=format&fit=crop&q=80",
          sortOrder: 1,
          isActive: true,
        },
        {
          name: "Kothey Chicken Momo (10 pcs)",
          description: "Pan-crisped bottom chicken momos with spicy coriander chutney",
          priceText: "Rs. 220",
          category: "Momos",
          imageUrl: null,
          sortOrder: 2,
          isActive: true,
        },
        {
          name: "Himalayan Jhol Momo (10 pcs)",
          description: "Steamed momos served in cold tangy spicy sesame chutney broth",
          priceText: "Rs. 240",
          category: "Specialties",
          imageUrl: null,
          sortOrder: 3,
          isActive: true,
        },
        {
          name: "Masala Milk Tea",
          description: "Brewed with fresh ginger, cardamom and rich whole milk",
          priceText: "Rs. 60",
          category: "Beverages",
          imageUrl: null,
          sortOrder: 4,
          isActive: true,
        },
      ],
    },
  ];

  for (const s of sitesData) {
    const { highlights, items, ...siteFields } = s;

    // Upsert Site by slug
    const site = await prisma.site.upsert({
      where: { slug: s.slug },
      update: {
        ...siteFields,
      },
      create: {
        ...siteFields,
      },
    });

    // Delete existing highlights & items to prevent duplication on multiple runs
    await prisma.siteHighlight.deleteMany({
      where: { siteId: site.id, businessId: site.businessId },
    });
    for (const h of highlights) {
      await prisma.siteHighlight.create({
        data: {
          ...h,
          siteId: site.id,
          businessId: site.businessId,
        },
      });
    }

    await prisma.siteItem.deleteMany({
      where: { siteId: site.id, businessId: site.businessId },
    });
    for (const item of items) {
      await prisma.siteItem.create({
        data: {
          ...item,
          siteId: site.id,
          businessId: site.businessId,
        },
      });
    }

    console.log(`✓ Seeded site: ${site.slug} (${site.name})`);
  }

  // 3. Upsert Sample Ads (Platform-wide)
  const sampleAds = [
    {
      title: "Apex Express Courier & Freight — Fast Nationwide Delivery",
      imageUrl:
        "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=400&auto=format&fit=crop&q=80",
      linkUrl: "https://example.com/apex-courier",
      sortOrder: 1,
      isActive: true,
    },
    {
      title: "Himalayan Organic Tea Gardens — Fresh Flush From Ilam",
      imageUrl:
        "https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=400&auto=format&fit=crop&q=80",
      linkUrl: "https://example.com/himalayan-tea",
      sortOrder: 2,
      isActive: true,
    },
  ];

  await prisma.siteAd.deleteMany({});
  for (const ad of sampleAds) {
    await prisma.siteAd.create({
      data: ad,
    });
  }
  console.log("✓ Seeded sample platform ads");

  console.log("sites:seed completed successfully.");
}

main()
  .catch((err) => {
    console.error("sites:seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
