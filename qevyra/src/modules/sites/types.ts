import { z } from "zod";

export const safeLinkSchema = z
  .string()
  .trim()
  .refine(
    (val) => {
      if (!val) return false;
      return (
        val.startsWith("/") ||
        val.startsWith("http://") ||
        val.startsWith("https://")
      );
    },
    { message: "Link must start with http://, https://, or /" }
  );

export function sanitizeSafeLink(val: unknown): string | null {
  if (typeof val !== "string") return null;
  const trimmed = val.trim();
  if (
    trimmed.startsWith("/") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://")
  ) {
    return trimmed;
  }
  return null;
}

export function sanitizePhoneDigits(val: unknown): string | null {
  if (typeof val !== "string") return null;
  const trimmed = val.trim();
  const hasLeadingPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return null;
  return hasLeadingPlus ? `+${digits}` : digits;
}

export function formatWhatsAppDigits(val: unknown): string | null {
  if (typeof val !== "string") return null;
  const digits = val.replace(/\D/g, "");
  return digits.length > 0 ? digits : null;
}

export function validatePrimaryColor(
  val: unknown,
  fallback = "#2563eb"
): string {
  if (typeof val !== "string") return fallback;
  const trimmed = val.trim();
  if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(trimmed)) {
    return trimmed;
  }
  return fallback;
}

export const socialLinkItemSchema = z.object({
  platform: z.string().trim().min(1),
  url: safeLinkSchema,
});

export const socialLinksSchema = z.array(socialLinkItemSchema);

export type SocialLinkItem = z.infer<typeof socialLinkItemSchema>;

export type SiteType = "GENERAL" | "TRACKING" | "MENU";

export interface SiteHighlightData {
  id: string;
  siteId: string;
  businessId: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  sortOrder: number;
}

export interface SiteItemData {
  id: string;
  siteId: string;
  businessId: string;
  name: string;
  description: string | null;
  priceText: string | null;
  imageUrl: string | null;
  category: string | null;
  sortOrder: number;
  isActive: boolean;
}

export interface SiteData {
  id: string;
  businessId: string;
  slug: string;
  type: SiteType;
  name: string;
  shortDescription: string | null;
  aboutText: string | null;
  storyText: string | null;
  logoUrl: string | null;
  heroImageUrl: string | null;
  primaryColor: string | null;
  phone: string | null;
  whatsapp: string | null;
  addressText: string | null;
  mapUrl: string | null;
  openingHours: string | null;
  googleReviewUrl: string | null;
  socialLinks: SocialLinkItem[];
  isPublished: boolean;
  enableItems: boolean;
  enableTrackOrder: boolean;
  enableAds: boolean;
  enableBooking: boolean;
  createdAt: Date;
  updatedAt: Date;
  highlights: SiteHighlightData[];
  items: SiteItemData[];
}

export interface SiteAdData {
  id: string;
  title: string;
  imageUrl: string;
  linkUrl: string;
  sortOrder: number;
  isActive: boolean;
}

export type SectionId =
  | "header"
  | "hero"
  | "what-we-do"
  | "story"
  | "main-buttons"
  | "visit-us"
  | "contact"
  | "opening-hours"
  | "google-review"
  | "social"
  | "item-list"
  | "menu-view"
  | "track-demo"
  | "ad-banner"
  | "footer";
