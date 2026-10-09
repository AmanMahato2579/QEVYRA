import { prisma } from "@/lib/prisma";
import {
  sanitizeSafeLink,
  sanitizePhoneDigits,
  validatePrimaryColor,
  socialLinksSchema,
  type SiteData,
  type SiteAdData,
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
    return null;
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
