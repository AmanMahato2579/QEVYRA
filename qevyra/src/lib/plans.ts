import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import {
  ALL_FEATURE_KEYS,
  ALL_FEATURES_MARKER,
  defaultPlanFor,
  isPlanId,
} from "@/lib/plan-catalog";
import { businessKindForType } from "@/lib/business-kind";
import { logActivity } from "@/lib/activity";

// ─── Effective Access ─────────────────────────────────────────────────────────
// The single source of truth for what a business can do:
//
//   Business → Subscription → Plan → Plan features/limits → Customer overrides
//   → Effective permissions → Application access
//
// Nothing else in the app should gate on `business.plan === "…"` directly.
// The ORDER module resolves its tenant's plan through Restaurant.businessId.

export interface BusinessAccessInput {
  plan?: string | null;
  featureOverrides?: string | null;
  limitOverrides?: string | null;
  starNumber?: number | null;
  /** BusinessType string — decides which product (menu vs track) the plan applies to. */
  type?: string | null;
}

export interface EffectiveAccess {
  plan: string;
  isStar: boolean;
  starNumber: number | null;
  features: Record<string, boolean>;
  limits: Record<string, number>;
}

export function parseFeatureKeys(json: string | null | undefined): string[] {
  try {
    const arr = JSON.parse(json ?? "[]");
    return Array.isArray(arr) ? arr.filter((s): s is string => typeof s === "string") : [];
  } catch {
    return [];
  }
}

export function parseLimitKeys(json: string | null | undefined): Record<string, number> {
  try {
    const obj = JSON.parse(json ?? "{}");
    const out: Record<string, number> = {};
    if (obj && typeof obj === "object") {
      for (const [k, v] of Object.entries(obj)) {
        if (typeof v === "number" && Number.isFinite(v)) out[k] = v;
      }
    }
    return out;
  } catch {
    return {};
  }
}

export function parseObjectOverrides(json: string | null | undefined): Record<string, unknown> {
  try {
    const obj = JSON.parse(json ?? "{}");
    return obj && typeof obj === "object" ? (obj as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export function serializeOverrides(obj: Record<string, unknown>): string {
  return JSON.stringify(obj);
}

/**
 * Effective feature/limit access for a business given its plan + overrides.
 * STAR uses the ALL_CURRENT_FEATURES marker: any feature later added to the
 * catalog is automatically available to Star customers.
 *
 * Plans are product-aware: a menu-kind business (restaurant, homestay, hotel)
 * gets the QR-menu tiers (BRONZE = menu + website, SILVER = + ordering), and a
 * track-kind business (tailor, garage, dry-cleaning, …) gets the Track tiers
 * (BRONZE = website only, SILVER = website + tracking). Product features never
 * leak across: a track tenant can never unlock menu features, and vice-versa,
 * unless the platform explicitly turns them on in a feature override.
 */
export async function getEffectiveAccess(business: BusinessAccessInput): Promise<EffectiveAccess> {
  const planId = business.plan && isPlanId(business.plan) ? business.plan : "STAR";
  const kind = businessKindForType(business.type);

  let featureKeys: string[] | null = null;
  let limits: Record<string, number> | null = null;

  const row = await prisma.plan.findUnique({ where: { id: planId } });
  if (row && row.isActive) {
    featureKeys = parseFeatureKeys(row.featureKeys);
    limits = parseLimitKeys(row.limitKeys);
  }

  if (featureKeys === null) {
    const def = defaultPlanFor(kind, planId);
    featureKeys = def.features;
    limits = def.limits;
  }

  const base = new Set(featureKeys.includes(ALL_FEATURES_MARKER) ? ALL_FEATURE_KEYS : featureKeys);

  const features: Record<string, boolean> = {};
  for (const key of ALL_FEATURE_KEYS) features[key] = base.has(key);

  const featureOverrides = parseObjectOverrides(business.featureOverrides);
  for (const [key, value] of Object.entries(featureOverrides)) {
    if (ALL_FEATURE_KEYS.includes(key) && typeof value === "boolean") features[key] = value;
  }

  // Product isolation: features owned by the other product stay off unless an
  // override explicitly grants them.
  const MENU_FAMILY = [
    "restaurant_profile",
    "digital_menu",
    "menu_management",
    "qr_tables",
    "ordering",
    "table_ordering",
    "order_management",
    "kitchen_workflow",
    "order_history",
  ] as const;
  if (kind === "track") {
    for (const key of MENU_FAMILY) {
      if (featureOverrides[key] !== true) features[key] = false;
    }
  } else {
    if (featureOverrides["business_track"] !== true) features["business_track"] = false;
  }

  const limitOverrides = parseObjectOverrides(business.limitOverrides);
  const effectiveLimits: Record<string, number> = { ...(limits ?? {}) };
  for (const [key, value] of Object.entries(limitOverrides)) {
    if (typeof value === "number" && Number.isFinite(value)) effectiveLimits[key] = value;
  }

  return {
    plan: planId,
    isStar: business.starNumber != null,
    starNumber: business.starNumber ?? null,
    features,
    limits: effectiveLimits,
  };
}

export function hasFeature(access: EffectiveAccess, feature: string): boolean {
  return access.features[feature] === true;
}

export function canOrder(access: EffectiveAccess): boolean {
  return hasFeature(access, "ordering");
}

export function canUse(access: EffectiveAccess, feature: string): boolean {
  return hasFeature(access, feature);
}

export function canBook(access: EffectiveAccess, bookingsEnabled: boolean): boolean {
  return hasFeature(access, "bookings") && bookingsEnabled;
}

/** Effective QR-table ceiling = plan limit (+ customer override). */
export function effectiveTableLimit(access: EffectiveAccess): number {
  const limit = access.limits["qrTables"];
  return typeof limit === "number" && Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 0;
}

export interface BusinessOpInput {
  id: string;
  name: string;
  isActive: boolean;
  subscriptionStatus: string | null;
  subscriptionExpiresAt: Date | string | null;
  neverExpires: boolean;
  autoOff: boolean;
}

function isSubscriptionExpired(r: Pick<BusinessOpInput, "neverExpires" | "subscriptionExpiresAt">): boolean {
  if (r.neverExpires || !r.subscriptionExpiresAt) return false;
  return new Date(r.subscriptionExpiresAt).getTime() < Date.now();
}

/**
 * Whether the business is operational today. An expired subscription only
 * disables the business when auto-off is ON; with auto-off OFF the business
 * keeps running (the Super Admin dashboard still reports it as expired).
 */
export function subscriptionOperational(r: Pick<BusinessOpInput, "subscriptionStatus" | "neverExpires" | "subscriptionExpiresAt" | "autoOff">): boolean {
  if (r.subscriptionStatus && r.subscriptionStatus !== "ACTIVE") return false;
  if (r.neverExpires) return true;
  if (isSubscriptionExpired(r)) return !r.autoOff;
  return true;
}

export function isBusinessOperational(r: BusinessOpInput): boolean {
  return Boolean(r.isActive && subscriptionOperational(r));
}

/**
 * Lazy auto-off enforcement: when a subscription has passed its expiry and
 * auto-off is ON, deactivate the business on the next visit so access is
 * actually revoked (and the dashboard reflects it) without needing a cron job.
 */
export async function enforceSubscriptionState(r: BusinessOpInput): Promise<"auto_off" | "grace" | "ok"> {
  if (!isSubscriptionExpired(r)) return "ok";
  if (r.autoOff && r.isActive) {
    await prisma.$transaction(async (tx) => {
      await tx.business.update({
        where: { id: r.id },
        data: { isActive: false, subscriptionStatus: "EXPIRED" },
      });
      await tx.restaurant.updateMany({
        where: { businessId: r.id },
        data: { isActive: false },
      });
    });
    await logActivity("subscription_auto_off", {
      businessId: r.id,
      businessName: r.name,
      detail: "Auto-off triggered after subscription expiration",
    });
    return "auto_off";
  }
  return "grace";
}

// ─── ORDER-module bridge ──────────────────────────────────────────────────────
// The ORDER module still resolves its operational tenant through the Restaurant
// profile for the transition. The merged shape keeps every existing caller
// working while plan/subscription state is read from the linked Business.

export type OperationalRestaurant = Prisma.RestaurantGetPayload<{
  include: { business: true };
}>;

/** Robust fetch used by order guards/pages. Returns the restaurant with its
 *  Business subscription merged so `getEffectiveAccess`/`isBusinessOperational`
 *  keep working against the same object. */
export async function loadOperationalRestaurant(id: string) {
  const restaurant = await prisma.restaurant.findUnique({
    where: { id },
    include: { business: true },
  });
  if (!restaurant?.business) return null;

  const business = restaurant.business;
  const op = {
    id: business.id,
    name: business.name,
    isActive: business.isActive,
    subscriptionStatus: business.subscriptionStatus,
    subscriptionExpiresAt: business.subscriptionExpiresAt,
    neverExpires: business.neverExpires,
    autoOff: business.autoOff,
  };
  await enforceSubscriptionState(op);
  return restaurant;
}