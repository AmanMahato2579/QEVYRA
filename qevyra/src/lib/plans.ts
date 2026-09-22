import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import {
  ALL_FEATURE_KEYS,
  ALL_FEATURES_MARKER,
  PRODUCT_IDS,
  aggregateProductFeatures,
  aggregateProductLimits,
  defaultPlanFor,
  isPlanId,
  planProductsFor,
  productById,
  type ProductTypeId,
} from "@/lib/plan-catalog";
import { businessKindForType } from "@/lib/business-kind";
import { logActivity } from "@/lib/activity";

// ─── Effective Access ─────────────────────────────────────────────────────────
// The single source of truth for what a business can do:
//
//   Business → BusinessProduct (active products) → Product feature/limit sets
//   → Customer overrides → Effective permissions → Application access
//
// Legacy plans (BRONZE/SILVER/STAR on Business.plan) remain as billing tiers
// and as a fallback when a business has no BusinessProduct rows yet.
//
// Nothing else in the app should gate on `business.plan === "…"` directly.
// The ORDER module resolves its tenant's plan through Restaurant.businessId.

export interface BusinessAccessInput {
  /** Business id — when present, access is derived from active BusinessProduct rows. */
  id?: string | null;
  plan?: string | null;
  featureOverrides?: string | null;
  limitOverrides?: string | null;
  starNumber?: number | null;
  /** BusinessType string — legacy fallback product selection. */
  type?: string | null;
}

export interface EffectiveProduct {
  id: ProductTypeId;
  isActive: boolean;
  label: string;
}

export interface EffectiveAccess {
  plan: string;
  isStar: boolean;
  starNumber: number | null;
  features: Record<string, boolean>;
  limits: Record<string, number>;
  /** Which QEVYRA products are granted/active for this business. */
  products: EffectiveProduct[];
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
 * Effective feature/limit access for a business given its active products (and
 * legacy plan + overrides). STAR uses the ALL_CURRENT_FEATURES marker: any
 * feature later added to the catalog is automatically available to Star
 * customers.
 *
 * Access is product-driven: when the business has BusinessProduct rows, the
 * union of the active products' feature/limit sets (Plan-catalog) is the
 * access. A legacy plan-only business falls back to the product-aware plan
 * tiers (menu kind → QR-menu tiers, track kind → Track tiers), so a track
 * tenant can never unlock menu features, and vice-versa, unless an override
 * explicitly grants them.
 */
export async function getEffectiveAccess(business: BusinessAccessInput): Promise<EffectiveAccess> {
  const planId = business.plan && isPlanId(business.plan) ? business.plan : "STAR";
  const kind = businessKindForType(business.type);
  const isStar = business.starNumber != null;

  // Product-driven path: active BusinessProduct rows are the source of truth.
  let productRows: { productId: ProductTypeId; isActive: boolean }[] | null = null;
  if (business.id) {
    const rows = await prisma.businessProduct.findMany({
      where: { businessId: business.id, isActive: true },
      select: { productId: true, isActive: true },
    });
    if (rows.length > 0) productRows = rows;
  }

  let featureKeys: string[] | null = null;
  let limits: Record<string, number> | null = null;

  if (productRows && productRows.length > 0) {
    featureKeys = aggregateProductFeatures(productRows);
    limits = aggregateProductLimits(productRows);
  } else {
    // Legacy fallback: plan tiers per product kind.
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
  }

  if (isStar) featureKeys = ALL_FEATURE_KEYS;

  const base = new Set(featureKeys.includes(ALL_FEATURES_MARKER) ? ALL_FEATURE_KEYS : featureKeys);

  const features: Record<string, boolean> = {};
  for (const key of ALL_FEATURE_KEYS) features[key] = base.has(key);

  const featureOverrides = parseObjectOverrides(business.featureOverrides);
  for (const [key, value] of Object.entries(featureOverrides)) {
    if (ALL_FEATURE_KEYS.includes(key) && typeof value === "boolean") features[key] = value;
  }

  // Product isolation on the legacy path: features owned by the other product
  // stay off unless an override explicitly grants them. Product rows already
  // constrain access natively, so this only guards the plan-only fallback.
  if (kind === "track") {
    if (featureOverrides["restaurant_profile"] !== true) features["restaurant_profile"] = false;
    if (featureOverrides["digital_menu"] !== true) features["digital_menu"] = false;
    if (featureOverrides["ordering"] !== true) features["ordering"] = false;
  } else {
    if (featureOverrides["business_track"] !== true) features["business_track"] = false;
  }

  const limitOverrides = parseObjectOverrides(business.limitOverrides);
  const effectiveLimits: Record<string, number> = { ...(limits ?? {}) };
  for (const [key, value] of Object.entries(limitOverrides)) {
    if (typeof value === "number" && Number.isFinite(value)) effectiveLimits[key] = value;
  }

  // Product grant list for UIs. When rows exist, honor them; otherwise infer
  // from the legacy plan + kind (same mapping used by the create flow).
  const activeProductSet =
    productRows && productRows.length > 0
      ? new Set(productRows.map((r) => r.productId))
      : new Set<ProductTypeId>(planProductsFor(kind, planId));
  const products: EffectiveProduct[] = PRODUCT_IDS.map((id) => ({
    id,
    isActive: activeProductSet.has(id),
    label: productById(id)?.label ?? id,
  }));

  return {
    plan: planId,
    isStar,
    starNumber: business.starNumber ?? null,
    features,
    limits: effectiveLimits,
    products,
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

/** Whether a business currently has the given product granted. */
export function canUseProduct(access: EffectiveAccess, productId: ProductTypeId): boolean {
  return access.products.some((p) => p.id === productId && p.isActive);
}

/** Whether a business has ANY product in a family (menu-family vs track-family). */
export function canUseProductFamily(access: EffectiveAccess, family: "menu" | "track"): boolean {
  const ids: ProductTypeId[] = family === "menu" ? ["MENU", "ORDER"] : ["TRACK", "TRACK_PRO"];
  return ids.some((id) => canUseProduct(access, id));
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