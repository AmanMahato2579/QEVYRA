// QEVYRA Website engine — server service.
// The universal "website for everyone" layer: every Business gets a light,
// customizable storefront. Structured content lives in the Website model;
// the Business row provides the address book (phone, WhatsApp, map, hours).
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getEffectiveAccess, canUse, canBook } from "@/lib/plans";
import { businessKindForType } from "@/lib/business-kind";

export type WebsiteWithBusiness = Prisma.WebsiteGetPayload<{
  include: { business: true; theme: true };
}>;

export type PublicWebsiteServiceButtons = {
  /** Booking enabled: a Restaurant is linked + bookings turned on + the bookings feature. Menu-kind tenants only. */
  bookings: boolean;
  /** Menu enabled: a Restaurant (menu product) is linked + the digital_menu feature. */
  menu: boolean;
  /** Track enabled: an active Workflow exists + the business_track feature. Track-kind tenants only. */
  track: boolean;
};

/** Per-business-type button labels so each service line reads naturally. */
export type ServiceButtonWording = {
  booking: string;
  menu: string;
  track: string;
};

export function serviceButtonWording(type: string, lang?: string): ServiceButtonWording {
  const nep = lang === "NEP";
  if (nep) {
    switch (type) {
      case "HOMESTAY":
      case "HOTEL":
        return { booking: "कोठा बुक गर्नुहोस्", menu: "मेनु हेर्नुहोस्", track: "बसाइ ट्र्याक गर्नुहोस्" };
      case "TAILOR":
        return { booking: "फिटिङ बुक गर्नुहोस्", menu: "सेवा हेर्नुहोस्", track: "मेरो अर्डर ट्र्याक गर्नुहोस्" };
      case "DRY_CLEANING":
        return { booking: "पिकअप बुक गर्नुहोस्", menu: "मूल्य हेर्नुहोस्", track: "अर्डर ट्र्याक गर्नुहोस्" };
      case "GARAGE":
        return { booking: "सेवा बुक गर्नुहोस्", menu: "सेवा हेर्नुहोस्", track: "सेवा ट्र्याक गर्नुहोस्" };
      case "CLEANING":
        return { booking: "सफाइ बुक गर्नुहोस्", menu: "सेवा हेर्नुहोस्", track: "सेवा ट्र्याक गर्नुहोस्" };
      case "REPAIR":
        return { booking: "मर्मत बुक गर्नुहोस्", menu: "सेवा हेर्नुहोस्", track: "मेरो मर्मत ट्र्याक गर्नुहोस्" };
      case "RETAIL":
        return { booking: "भेट बुक गर्नुहोस्", menu: "उत्पादन हेर्नुहोस्", track: "सेवा ट्र्याक गर्नुहोस्" };
      case "RESTAURANT":
        return { booking: "टेबल बुक गर्नुहोस्", menu: "मेनु हेर्नुहोस्", track: "सेवा ट्र्याक गर्नुहोस्" };
      case "SERVICE":
        return { booking: "सेवा बुक गर्नुहोस्", menu: "सेवा हेर्नुहोस्", track: "सेवा ट्र्याक गर्नुहोस्" };
      default:
        return { booking: "बुक गर्नुहोस्", menu: "मेनु हेर्नुहोस्", track: "सेवा ट्र्याक गर्नुहोस्" };
    }
  }
  switch (type) {
    case "HOMESTAY":
    case "HOTEL":
      return { booking: "Book a Room", menu: "View Menu", track: "Track Stay" };
    case "TAILOR":
      return { booking: "Book a Fitting", menu: "View Services", track: "Track My Order" };
    case "DRY_CLEANING":
      return { booking: "Book a Pickup", menu: "View Prices", track: "Track Order" };
    case "GARAGE":
      return { booking: "Book a Service", menu: "View Services", track: "Track Service" };
    case "CLEANING":
      return { booking: "Book Cleaning", menu: "View Services", track: "Track Service" };
    case "REPAIR":
      return { booking: "Book a Repair", menu: "View Services", track: "Track My Repair" };
    case "RETAIL":
      return { booking: "Book a Visit", menu: "View Products", track: "Track Service" };
    case "RESTAURANT":
      return { booking: "Book a Table", menu: "View Menu", track: "Track Service" };
    case "SERVICE":
      return { booking: "Book a Service", menu: "View Services", track: "Track Service" };
    default:
      return { booking: "Book Now", menu: "View Menu", track: "Track Service" };
  }
}

/**
 * One well-written, category-specific paragraph for each business line. Shown
 * on the public website when the owner hasn't written their own subtitle.
 */
export function categoryBlurb(type: string, lang?: string): string {
  const nep = lang === "NEP";
  const map: Record<string, { en: string; nep: string }> = {
    TAILOR: {
      en: "Clothes made to measure and a proper fit every time. Stitching, alterations or a full outfit — tell us what you need and we take care of the rest.",
      nep: "माप अनुसार कपडा सिलाएर हरेक पटक राम्रो फिटका साथ तयार पारिन्छ। सिलाइ, मर्मत वा पूरै पोशाक — के चाहिन्छ भन्नुहोस्, बाँकी हामी सम्हाल्छौँ।",
    },
    DRY_CLEANING: {
      en: "Your clothes get the care they deserve — cleaned properly, pressed neatly and ready to wear for suits, coats and delicate fabrics alike.",
      nep: "तपाईंका लुगाहरू उचित हेरचाहका साथ राम्ररी धोइदिएर, मिलाएर इस्त्री गरी लगाउन तयार पारिन्छ — सुट, कोट र नाजुक कपडा सबैका लागि।",
    },
    GARAGE: {
      en: "Honest work on your vehicle — from routine service to a full repair, diagnosed properly and fixed right the first time.",
      nep: "गाडीको राम्रो मर्मत — नियमित सेवादेखि पूरा मर्मतसम्म, सही निदान गरी एकै पटकमा राम्ररी मिलाइन्छ।",
    },
    CLEANING: {
      en: "A genuinely clean home or office — deep cleaning, regular tidying and move-in or move-out, all done with care and attention to detail.",
      nep: "साँच्चिकै सफा घर वा अफिस — गहिरो सफाइ, नियमित सरसफाइ र घर सर्दाको सफाइ, सबै सचेततापूर्वक।",
    },
    REPAIR: {
      en: "Broken things come back to life — properly fixed, honestly priced and ready to use again, from electronics to furniture.",
      nep: "भाँचिएका सामानहरू फेरि काम लाग्ने बनाइन्छ — उचित मूल्यमा राम्ररी मर्मत भएर, इलेक्ट्रोनिक्सदेखि फर्निचरसम्म।",
    },
    SERVICE: {
      en: "Reliable, quality service with clear communication from start to finish. See how we work and what our customers say about us.",
      nep: "सुरुदेखि अन्त्यसम्म स्पष्ट सम्पर्कका साथ भरपर्दो र गुणस्तरीय सेवा। हामी कसरी काम गर्छौं र ग्राहकहरू के भन्छन् हेर्नुहोस्।",
    },
    RETAIL: {
      en: "Genuine products at fair prices, chosen with care. Visit us, message us or come say hi in person.",
      nep: "उचित मूल्यमा वास्तविक उत्पादनहरू, ध्यानपूर्वक छानिएका। भेट्नुहोस्, सन्देश पठाउनुहोस् वा आएर भेट्नुहोस्।",
    },
    RESTAURANT: {
      en: "Good food, honest portions and a warm welcome. Browse our menu, book a table and come dine with us.",
      nep: "राम्रो खाना, सोझो परिमाण र न्यानो स्वागत। हाम्रो मेनु हेर्नुहोस्, टेबल बुक गर्नुहोस् र आएर खानुहोस्।",
    },
    HOMESTAY: {
      en: "Stay like family — comfortable rooms, home-cooked food and a genuinely local experience from the moment you arrive.",
      nep: "परिवारजस्तै बसाइ — आरामदायी कोठा, घरेलु खाना र आइपुग्नेबित्तिकै साँच्चिकै स्थानीय अनुभव।",
    },
    HOTEL: {
      en: "A comfortable stay in a great location — clean rooms, friendly service and everything you need within easy reach.",
      nep: "राम्रो स्थानमा आरामदायी बसाइ — सफा कोठा, मैत्रीपूर्ण सेवा र चाहिएका सबै कुरा नजिकै।",
    },
  };
  const entry = map[type] ?? {
    en: "Explore what we do and how we serve our customers — reach out for anything you need.",
    nep: "हामीले के गर्छौं र ग्राहकलाई कसरी सेवा गर्छौं हेर्नुहोस् — चाहिएको कुराका लागि सम्पर्क गर्नुहोस्।",
  };
  return nep ? entry.nep : entry.en;
}

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
    googleReviewUrl: string | null;
  };
  meta: { metaTitle: string | null; metaDescription: string | null };
  services: PublicWebsiteServiceButtons;
};

/**
 * Derive which QEVYRA engine entry-points this business's website may show.
 * Rule: a button exists only when the capability is real — a linked module
 * AND the plan feature. Never a fake button.
 */
async function deriveServiceButtons(businessId: string): Promise<PublicWebsiteServiceButtons> {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: {
      type: true,
      plan: true,
      featureOverrides: true,
      limitOverrides: true,
      starNumber: true,
      restaurant: { select: { id: true, bookingsEnabled: true } },
      workflows: { where: { isActive: true }, select: { id: true }, take: 1 },
    },
  });
  if (!business) return { bookings: false, menu: false, track: false };

  // Data isolation: a tenant's product decides its website actions. Menu-kind
  // businesses (restaurants, homestays, hotels) get menu + table bookings;
  // track-kind businesses (services) get only the ticket-lookup box.
  const kind = businessKindForType(business.type);
  const access = await getEffectiveAccess(business);
  const menu = kind === "menu" && Boolean(business.restaurant) && canUse(access, "digital_menu");
  const bookings = kind === "menu" && Boolean(business.restaurant?.bookingsEnabled) && canBook(access, Boolean(business.restaurant?.bookingsEnabled));
  return {
    bookings,
    menu,
    track: kind === "track" && business.workflows.length > 0 && canUse(access, "business_track"),
  };
}

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
  const services = await deriveServiceButtons(b.id);
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
      googleReviewUrl: website.googleReviewUrl,
    },
    meta: { metaTitle: website.metaTitle, metaDescription: website.metaDescription },
    services,
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