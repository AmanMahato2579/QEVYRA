// QEVYRA navigation & module visibility — pure + import-safe.
//
// One catalog drives which admin modules a business sees. Visibility is the
// AND of three independent gates:
//   1. module flag   — the business has the product enabling it (MENU/ORDER/…)
//   2. permission    — the signed-in role may use it (see permissions.ts)
//   3. runtime flag  — e.g. the business switched bookings on
//
// This is UI-only: the real boundary is the server guard. Hiding a nav item is
// convenience; `apiGuard` is security.

import type { Permission } from "@/lib/permissions";
import { hasPermission } from "@/lib/permissions";
import type { ProductTypeId } from "@/lib/plan-catalog";

export type BusinessKind = "menu" | "track";

export interface ModuleFlags {
  menu: boolean;
  order: boolean;
  website: boolean;
  track: boolean;
}

/**
 * Derive module flags from a tenant's ACTIVE product ids. An empty list means a
 * legacy tenant with no `BusinessProduct` rows yet → everything is enabled
 * (backwards-compatible with the pre-products admin).
 */
export function moduleFlagsFromProducts(activeProductIds: readonly string[]): ModuleFlags {
  const legacy = activeProductIds.length === 0;
  const has = (id: ProductTypeId | string) => legacy || activeProductIds.includes(id);
  return {
    menu: has("MENU"),
    order: has("ORDER"),
    website: has("WEBSITE"),
    track: has("TRACK") || has("TRACK_PRO"),
  };
}

export interface BusinessNavItem {
  key: string;
  href: string;
  label: string;
  /** Empty/undefined = always visible (still subject to auth/kind). */
  permission?: Permission;
  /** Module gate; undefined = not module-bound. */
  module?: keyof ModuleFlags;
  /** Extra runtime requirement, resolved by the caller. */
  requires?: "bookings";
  /** Which product family this screen belongs to. */
  kind: BusinessKind | "both";
  exact?: boolean;
}

export const BUSINESS_NAV: BusinessNavItem[] = [
  { key: "dashboard", href: "/admin", label: "Dashboard", kind: "both", exact: true },
  { key: "take-order", href: "/admin/service", label: "Take Order", kind: "menu", module: "order", permission: "orders.manage" },
  { key: "orders", href: "/admin/orders", label: "Orders", kind: "menu", module: "order", permission: "orders.view" },
  { key: "menu", href: "/admin/menu", label: "Menu", kind: "menu", module: "menu", permission: "catalog.view" },
  { key: "website", href: "/admin/website", label: "Website", kind: "both", module: "website", permission: "website.view" },
  { key: "tables", href: "/admin/tables", label: "Tables", kind: "menu", module: "order", permission: "resources.view" },
  { key: "bookings", href: "/admin/bookings", label: "Bookings", kind: "menu", module: "website", permission: "bookings.view", requires: "bookings" },
  { key: "inventory", href: "/admin/inventory", label: "Inventory", kind: "menu", permission: "inventory.view" },
  { key: "notifications", href: "/admin/notifications", label: "Notifications", kind: "both", permission: "notifications.manage" },
  { key: "settings", href: "/admin/settings", label: "Settings", kind: "menu", permission: "business.settings.manage" },

  { key: "track-dashboard", href: "/track-admin", label: "Dashboard", kind: "track", exact: true },
  { key: "track-tickets", href: "/track-admin/tickets", label: "Tickets", kind: "track", permission: "tickets.view" },
  { key: "track-workflows", href: "/track-admin/workflows", label: "Workflows", kind: "track", permission: "workflows.manage" },
  { key: "track-website", href: "/track-admin/website", label: "Website", kind: "track", module: "website", permission: "website.view" },
];

export interface NavVisibilityInput {
  kind: BusinessKind;
  role: string | null | undefined;
  modules: ModuleFlags;
  bookingsEnabled?: boolean;
}

/** Filter the nav catalog to what this business + role may actually see. */
export function visibleBusinessNav(input: NavVisibilityInput): BusinessNavItem[] {
  return BUSINESS_NAV.filter((item) => {
    if (item.kind !== "both" && item.kind !== input.kind) return false;
    if (item.module && !input.modules[item.module]) return false;
    if (item.permission && !hasPermission(input.role, item.permission)) return false;
    if (item.requires === "bookings" && !input.bookingsEnabled) return false;
    return true;
  });
}
