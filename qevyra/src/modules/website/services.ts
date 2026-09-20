// QEVYRA Website engine — server service.
// The universal "website for everyone" layer: every Business gets a light,
// customizable storefront. Structured content lives in the Website model;
// the Business row provides the address book (phone, WhatsApp, map, hours).
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export type WebsiteWithBusiness = Prisma.WebsiteGetPayload<{
  include: { business: true; theme: true };
}>;

export type PublicWebsite = {
  business: {
    name: string;
    slug: string;
    description: string | null;
    logoUrl: string | null;
    coverUrl: string | null;
    phone: string | null;
    whatsapp: string | null;
    address: string | null;
    mapUrl: string | null;
    openingHours: string | null;
    language: string;
    brandColor: string;
    type: string;
  };
  theme: {
    primaryColor: string;
    background: string;
    fontFamily: string | null;
  } | null;
  content: {
    heroTitle: string | null;
    heroSubtitle: string | null;
    heroImageUrl: string | null;
    heroCtaLabel: string | null;
    heroCtaLink: string | null;
    aboutTitle: string | null;
    aboutText: string | null;
    aboutImageUrl: string | null;
    servicesTitle: string | null;
    servicesText: string | null;
    contactPhone: string | null;
    contactEmail: string | null;
    addressText: string | null;
    mapUrl: string | null;
    footerText: string | null;
  };
  meta: { metaTitle: string | null; metaDescription: string | null };
};

/**
 * Public lookup by business slug. Only returns a page when the business is
 * active AND the website is published (configurable storefront).
 */
export async function getPublicWebsite(slug: string): Promise<PublicWebsite | null> {
  const website = await prisma.website.findFirst({
    where: { business: { slug, isActive: true }, isPublished: true },
    include: { business: true, theme: true },
  });
  if (!website) return null;

  const b = website.business;
  return {
    business: {
      name: b.name,
      slug: b.slug,
      description: b.description,
      logoUrl: b.logoUrl,
      coverUrl: b.coverUrl,
      phone: b.phone,
      whatsapp: b.whatsapp,
      address: b.address,
      mapUrl: b.mapUrl,
      openingHours: b.openingHours,
      language: b.language,
      brandColor: b.brandColor,
      type: b.type,
    },
    theme: website.theme
      ? {
          primaryColor: website.theme.primaryColor,
          background: website.theme.background,
          fontFamily: website.theme.fontFamily,
        }
      : null,
    content: {
      heroTitle: website.heroTitle,
      heroSubtitle: website.heroSubtitle,
      heroImageUrl: website.heroImageUrl,
      heroCtaLabel: website.heroCtaLabel,
      heroCtaLink: website.heroCtaLink,
      aboutTitle: website.aboutTitle,
      aboutText: website.aboutText,
      aboutImageUrl: website.aboutImageUrl,
      servicesTitle: website.servicesTitle,
      servicesText: website.servicesText,
      contactPhone: website.contactPhone,
      contactEmail: website.contactEmail,
      addressText: website.addressText,
      mapUrl: website.mapUrl,
      footerText: website.footerText,
    },
    meta: { metaTitle: website.metaTitle, metaDescription: website.metaDescription },
  };
}

/**
 * Admin editor lookup — tenant-scoped by business id. Returns the website
 * content plus theme catalog so the editor can offer the presets.
 */
export async function getWebsiteForBusiness(businessId: string) {
  const website = await prisma.website.findUnique({
    where: { businessId },
    include: { business: true, theme: true },
  });
  return website;
}

/** Theme catalog used by the editor + server validation. */
export async function listWebsiteThemes() {
  return prisma.websiteTheme.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });
}

export function validThemeId(candidate: string | null | undefined): string | null {
  return candidate && candidate.trim().length > 0 ? candidate.trim() : null;
}