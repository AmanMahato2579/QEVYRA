// Pure QEVYRA sales packages — what a shop actually buys, priced in INR.
// Maps each package to a plan + per-business feature overrides so the same
// platform code enforces exactly what the customer paid for.
// Importable from both client and server code (no Prisma / I/O here).
//
// Offer prices (owner-set, editable below):
//   - Website only ........ ₹2,500 for 1.5 years
//   - Website + QR menu .... ₹2,500 per year (view only, no ordering)
//   - Restaurant (full) .... Setup fee + monthly plan
//   - Tracking (SaaS) ...... Custom: website only OR website + tracking
import type { PlanId } from "@/lib/plan-catalog";

export const PACKAGE_IDS = ["website", "website_menu", "restaurant", "track"] as const;
export type PackageId = (typeof PACKAGE_IDS)[number];

export interface QevyraPackage {
  id: PackageId;
  name: string;
  shortName: string;
  tagline: string;
  priceLine: string;
  priceNote: string;
  billing: "one_time" | "custom";
  points: string[];
  plan: PlanId;
  /** Feature keys disabled for this package (per-business feature overrides). */
  featureOff: string[];
  /** Subscription length applied when the store is created from this package. */
  defaultDays: number;
  /** True when the CTA should be "contact us" instead of a signup link. */
  contact: boolean;
}

export const PACKAGES: QevyraPackage[] = [
  {
    id: "website",
    name: "Website only",
    shortName: "Website",
    tagline: "Your shop online with your own name",
    priceLine: "₹2,500",
    priceNote: "for 1.5 years",
    billing: "one_time",
    points: ["Personal business website", "Your own address (yourname.qevyra.app)", "WhatsApp / call button", "QR code for your counter"],
    plan: "BRONZE",
    featureOff: ["digital_menu", "menu_management", "qr_tables", "business_track"],
    defaultDays: 548,
    contact: false,
  },
  {
    id: "website_menu",
    name: "Website + QR menu",
    shortName: "Website + Menu",
    tagline: "Show your menu on every table",
    priceLine: "₹2,500",
    priceNote: "per year",
    billing: "one_time",
    points: ["Everything in Website", "Menu visible by QR at your counter/table", "Live price & availability", "Update menu anytime"],
    plan: "BRONZE",
    featureOff: [],
    defaultDays: 365,
    contact: false,
  },
  {
    id: "restaurant",
    name: "Restaurant (full)",
    shortName: "Restaurant",
    tagline: "QR ordering, kitchen workflow, billing",
    priceLine: "Setup fee + monthly",
    priceNote: "contact for the plan",
    billing: "custom",
    points: ["Everything in Website + QR menu", "Customers order and pay via QR", "Kitchen screen & order flow", "Bill-ready order history"],
    plan: "SILVER",
    featureOff: [],
    defaultDays: 30,
    contact: true,
  },
  {
    id: "track",
    name: "Tracking (service shops)",
    shortName: "Tracking",
    tagline: "Garage, tailor, salon — live job tracking",
    priceLine: "Custom",
    priceNote: "website only, or website + tracking",
    billing: "custom",
    points: ["Business website", "Ticket tracking QR for your counter", "Admin app to move jobs & close tickets", "Today's history, reset each night"],
    plan: "SILVER",
    featureOff: ["digital_menu", "menu_management", "qr_tables", "ordering", "table_ordering", "order_management", "kitchen_workflow", "order_history", "bookings"],
    defaultDays: 365,
    contact: true,
  },
];

export function findPackage(id: string | null | undefined): QevyraPackage | undefined {
  if (!id) return undefined;
  return PACKAGES.find((p) => p.id === id);
}

export const CONTACT_EMAIL = "contact@qevyra.com";