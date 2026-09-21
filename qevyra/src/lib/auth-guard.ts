import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Prisma, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { AdminUser } from "@/types";
import {
  loadOperationalRestaurant,
  isBusinessOperational,
  enforceSubscriptionState,
  getEffectiveAccess,
  type EffectiveAccess,
} from "@/lib/plans";

export async function requireAuth(): Promise<AdminUser> {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  return session.user as unknown as AdminUser;
}

// ─── Business (universal tenant) context ─────────────────────────────────────
// Used by the Website + Track modules, which are governed by the Business row
// (plan/subscription/features) rather than a Restaurant (ORDER) profile.

export type BusinessContext = {
  user: AdminUser;
  business: Prisma.BusinessGetPayload<Record<string, never>>;
  access: EffectiveAccess;
};

/**
 * Resolve the authenticated restaurant-admin to their Business tenant with
 * effective plan access. Returns null when not authorized or not operational,
 * so pages can redirect and API routes can reply 403 — no redirects thrown here.
 */
export async function loadBusinessContext(): Promise<BusinessContext | null> {
  const session = await auth();
  const user = session?.user as unknown as AdminUser | undefined;
  if (!user || user.role !== UserRole.RESTAURANT_ADMIN) return null;

  const businessId = (user as { businessId?: string | null }).businessId;
  if (!businessId) return null;

  const business = await prisma.business.findUnique({ where: { id: businessId } });
  if (!business) return null;

  await enforceSubscriptionState(business);
  if (!isBusinessOperational(business)) return null;

  const access = await getEffectiveAccess(business);
  return { user, business, access };
}

/** Page guard: redirects instead of returning null. */
export async function requireBusinessAdmin(): Promise<BusinessContext> {
  const ctx = await loadBusinessContext();
  if (!ctx) redirect("/inactive");
  return ctx;
}

export async function requireSuperAdmin(): Promise<AdminUser> {
  const user = await requireAuth();
  if (user.role !== UserRole.SUPER_ADMIN) {
    redirect("/admin");
  }
  return user;
}

export async function requireRestaurantAdmin(): Promise<AdminUser> {
  const user = await requireAuth();
  if (user.role !== UserRole.RESTAURANT_ADMIN || !user.restaurantId) {
    redirect("/login");
  }
  
  const restaurant = await loadOperationalRestaurant(user.restaurantId!);
  if (!restaurant?.business || !isBusinessOperational(restaurant.business)) {
    redirect("/inactive");
  }
  
  return user;
}
