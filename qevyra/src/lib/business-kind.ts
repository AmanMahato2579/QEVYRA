// QEVYRA product routing — pure + edge-safe (no node/prisma imports).
//
// The platform runs TWO SaaS products under one login and one shared
// client-data hub. Business data stays isolated per tenant:
//   - "menu"  → QR-menu SaaS (restaurants, homestays, hotels): menu, orders,
//               tables, bill, bookings. Admin lives at /admin.
//   - "track" → Track SaaS (tailors, dry-cleaners, garages, cleaners,
//               repair shops and other service lines): ticket + status
//               management. Admin lives at /track-admin.
//
// Which product a business uses is decided by its BusinessType.

export type BusinessKind = "menu" | "track";

/** BusinessTypes that are Track-SaaS tenants. Everything else is menu-QR. */
export const TRACK_BUSINESS_TYPES = new Set<string>([
  "TAILOR",
  "DRY_CLEANING",
  "GARAGE",
  "CLEANING",
  "REPAIR",
  "SERVICE",
  "RETAIL",
]);

export function isTrackBusinessType(type: string | null | undefined): boolean {
  return !!type && TRACK_BUSINESS_TYPES.has(type);
}

export function businessKindForType(type: string | null | undefined): BusinessKind {
  return isTrackBusinessType(type) ? "track" : "menu";
}