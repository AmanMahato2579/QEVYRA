import { prisma } from "@/lib/prisma";
import {
  getEffectiveAccess,
  canUse,
  canBook,
  canUseProductFamily,
} from "@/lib/plans";
import {
  sanitizeSafeLink,
  sanitizePhoneDigits,
  validatePrimaryColor,
  socialLinksSchema,
  type SiteData,
  type SiteAdData,
  type SiteType,
  type SiteHighlightData,
  type SiteItemData,
  type SocialLinkItem,
} from "./types";

export async function getSiteBySlug(slug: string): Promise<SiteData | null> {
  const site = await prisma.site.findFirst({
    where: {
      slug,
      isPublished: true,
      business: {
        isActive: true,
      },
    },
    select: {
      id: true,
      businessId: true,
      slug: true,
      type: true,
      name: true,
      shortDescription: true,
      aboutText: true,
      storyText: true,
      logoUrl: true,
      heroImageUrl: true,
      primaryColor: true,
      phone: true,
      whatsapp: true,
      addressText: true,
      mapUrl: true,
      openingHours: true,
      googleReviewUrl: true,
      socialLinks: true,
      isPublished: true,
      enableItems: true,
      enableTrackOrder: true,
      enableAds: true,
      enableBooking: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!site) {
    return getSiteFromWebsiteBySlug(slug);
  }

  const [highlights, items] = await Promise.all([
    prisma.siteHighlight.findMany({
      where: {
        siteId: site.id,
        businessId: site.businessId,
      },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        siteId: true,
        businessId: true,
        title: true,
        description: true,
        imageUrl: true,
        sortOrder: true,
      },
    }),
    prisma.siteItem.findMany({
      where: {
        siteId: site.id,
        businessId: site.businessId,
        isActive: true,
      },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        siteId: true,
        businessId: true,
        name: true,
        description: true,
        priceText: true,
        imageUrl: true,
        category: true,
        sortOrder: true,
        isActive: true,
      },
    }),
  ]);

  let parsedSocialLinks: SocialLinkItem[] = [];
  if (Array.isArray(site.socialLinks)) {
    const parseResult = socialLinksSchema.safeParse(site.socialLinks);
    if (parseResult.success) {
      parsedSocialLinks = parseResult.data;
    } else {
      parsedSocialLinks = (site.socialLinks as unknown[])
        .map((item) => {
          if (
            item &&
            typeof item === "object" &&
            "platform" in item &&
            "url" in item &&
            typeof (item as { platform: unknown }).platform === "string"
          ) {
            const rawUrl = (item as { url: unknown }).url;
            const validUrl = sanitizeSafeLink(rawUrl);
            if (validUrl) {
              return {
                platform: (item as { platform: string }).platform,
                url: validUrl,
              };
            }
          }
          return null;
        })
        .filter((i): i is SocialLinkItem => i !== null);
    }
  }

  return {
    ...site,
    primaryColor: validatePrimaryColor(site.primaryColor),
    phone: sanitizePhoneDigits(site.phone),
    whatsapp: sanitizePhoneDigits(site.whatsapp),
    logoUrl: sanitizeSafeLink(site.logoUrl),
    heroImageUrl: sanitizeSafeLink(site.heroImageUrl),
    mapUrl: sanitizeSafeLink(site.mapUrl),
    googleReviewUrl: sanitizeSafeLink(site.googleReviewUrl),
    socialLinks: parsedSocialLinks,
    highlights: highlights.map((h) => ({
      ...h,
      imageUrl: sanitizeSafeLink(h.imageUrl),
    })),
    items: items.map((item) => ({
      ...item,
      imageUrl: sanitizeSafeLink(item.imageUrl),
    })),
  };
}

export async function getActiveAds(limit = 2): Promise<SiteAdData[]> {
  const ads = await prisma.siteAd.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    take: limit,
    select: {
      id: true,
      title: true,
      imageUrl: true,
      linkUrl: true,
      sortOrder: true,
      isActive: true,
    },
  });

  return ads
    .map((ad) => {
      const linkUrl = sanitizeSafeLink(ad.linkUrl);
      const imageUrl = sanitizeSafeLink(ad.imageUrl);
      if (!linkUrl || !imageUrl) {
        return null;
      }
      return {
        ...ad,
        linkUrl,
        imageUrl,
      };
    })
    .filter((ad): ad is SiteAdData => ad !== null);
}

function parseWebsiteSocialLinks(raw: string | null): SocialLinkItem[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const out: SocialLinkItem[] = [];
    for (const entry of parsed) {
      if (!entry || typeof entry !== "object") continue;
      const platform = String(
        (entry as { kind?: unknown; platform?: unknown }).kind ??
          (entry as { platform?: unknown }).platform ??
          ""
      ).trim();
      const url = sanitizeSafeLink((entry as { url?: unknown }).url);
      if (platform && url) {
        out.push({ platform, url });
      }
    }
    return out;
  } catch {
    return [];
  }
}

function formatPriceText(price: unknown, currency: string): string | null {
  const amount = Number(price);
  if (!Number.isFinite(amount)) return null;
  const value = amount % 1 === 0 ? String(amount) : amount.toFixed(2);
  return currency ? `${currency} ${value}` : value;
}

/**
 * Transitional bridge (build-plan gap 8). Businesses whose storefront still
 * lives in the legacy `Website` model are served through the canonical `Site`
 * engine, so `/s/[slug]` is the single public site route (and `/b/[slug]`
 * simply redirects here). Reads the shared platform tables through
 * `@/lib/prisma` — no module-to-module imports.
 */
async function getSiteFromWebsiteBySlug(slug: string): Promise<SiteData | null> {
  const website = await prisma.website.findFirst({
    where: { business: { slug, isActive: true }, isPublished: true },
    include: {
      theme: true,
      business: {
        select: {
          id: true,
          name: true,
          slug: true,
          type: true,
          description: true,
          logoUrl: true,
          coverUrl: true,
          phone: true,
          whatsapp: true,
          address: true,
          mapUrl: true,
          openingHours: true,
          brandColor: true,
          plan: true,
          featureOverrides: true,
          limitOverrides: true,
          starNumber: true,
          restaurant: {
            select: { id: true, currency: true, bookingsEnabled: true },
          },
          workflows: {
            where: { isActive: true },
            select: { id: true },
            take: 1,
          },
        },
      },
    },
  });

  if (!website) return null;
  const b = website.business;

  const access = await getEffectiveAccess(b);
  const menuProduct = canUseProductFamily(access, "menu");
  const trackProduct = canUseProductFamily(access, "track");
  const menuEnabled =
    menuProduct && Boolean(b.restaurant) && canUse(access, "digital_menu");
  const bookingsEnabled =
    menuProduct &&
    Boolean(b.restaurant?.bookingsEnabled) &&
    canBook(access, Boolean(b.restaurant?.bookingsEnabled));
  const trackEnabled =
    trackProduct &&
    b.workflows.length > 0 &&
    canUse(access, "business_track");

  const type: SiteType = menuEnabled || bookingsEnabled
    ? "MENU"
    : trackEnabled
    ? "TRACKING"
    : "GENERAL";

  let items: SiteItemData[] = [];
  if (menuEnabled && b.restaurant) {
    const menuItems = await prisma.menuItem.findMany({
      where: {
        restaurantId: b.restaurant.id,
        isAvailable: true,
        category: { isActive: true },
      },
      orderBy: { createdAt: "asc" },
      take: 50,
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        imageUrl: true,
        category: { select: { name: true } },
      },
    });
    items = menuItems.map((item, index) => ({
      id: item.id,
      siteId: website.id,
      businessId: b.id,
      name: item.name,
      description: item.description,
      priceText: formatPriceText(item.price, b.restaurant?.currency ?? ""),
      imageUrl: item.imageUrl,
      category: item.category?.name ?? null,
      sortOrder: index,
      isActive: true,
    }));
  }

  const highlights: SiteHighlightData[] = [];
  if (website.servicesText || website.servicesTitle) {
    highlights.push({
      id: `${website.id}-services`,
      siteId: website.id,
      businessId: b.id,
      title: website.servicesTitle ?? "What We Do",
      description: website.servicesText,
      imageUrl: null,
      sortOrder: 0,
    });
  }

  return {
    id: website.id,
    businessId: b.id,
    slug: b.slug,
    type,
    name: b.name,
    shortDescription: website.heroSubtitle ?? b.description ?? null,
    aboutText: b.description ?? website.heroSubtitle ?? null,
    storyText: website.aboutText ?? null,
    logoUrl: b.logoUrl,
    heroImageUrl: website.heroImageUrl ?? b.coverUrl ?? null,
    primaryColor: website.theme?.primaryColor ?? b.brandColor ?? null,
    phone: b.phone,
    whatsapp: b.whatsapp,
    addressText: website.addressText ?? b.address ?? null,
    mapUrl: website.mapUrl ?? b.mapUrl ?? null,
    openingHours: b.openingHours,
    googleReviewUrl: website.googleReviewUrl,
    socialLinks: parseWebsiteSocialLinks(website.socialLinks),
    isPublished: website.isPublished,
    enableItems: menuEnabled,
    enableTrackOrder: trackEnabled,
    enableAds: false,
    enableBooking: bookingsEnabled,
    createdAt: website.createdAt,
    updatedAt: website.updatedAt,
    highlights,
    items,
  };
}
