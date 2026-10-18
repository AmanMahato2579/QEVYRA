// QEVYRA permissions — pure + import-safe (no Prisma / next / node imports).
//
// The single source of truth for WHO may do WHAT. Server routes enforce through
// `src/lib/api-guard.ts`; UI visibility reads the same catalog so a hidden
// button and a rejected request can never disagree.
//
// Roles today (UserRole) are the three platform logins. Staff roles (Manager,
// Waiter, Technician, …) are modeled here ahead of the BusinessMembership
// migration so permission checks written now keep working once staff accounts
// land — no ad-hoc role checks in routes, ever.

export const PERMISSIONS = [
  // Platform administration (QEVYRA staff only)
  "platform.businesses",
  "platform.plans",
  "platform.settings",
  "platform.activity",
  "platform.moderate",

  // Business profile & account
  "business.profile.view",
  "business.profile.manage",
  "business.settings.manage",
  "business.team.view",
  "business.team.manage",
  "business.billing.view",

  // Public website
  "website.view",
  "website.manage",

  // Suite A — catalog, orders, resources, bookings
  "catalog.view",
  "catalog.manage",
  "orders.view",
  "orders.manage",
  "resources.view",
  "resources.manage",
  "bookings.view",
  "bookings.manage",
  "inventory.view",
  "inventory.manage",

  // Suite B — services, workflows, tickets
  "services.view",
  "services.manage",
  "workflows.view",
  "workflows.manage",
  "tickets.view",
  "tickets.manage",
  "tickets.assign",

  // Shared records & reporting
  "customers.view",
  "customers.manage",
  "analytics.view",
  "notifications.manage",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export interface PermissionDef {
  key: Permission;
  label: string;
  group:
    | "platform"
    | "business"
    | "website"
    | "catalog"
    | "operations"
    | "service"
    | "records";
}

export const PERMISSION_CATALOG: PermissionDef[] = [
  { key: "platform.businesses", label: "Manage businesses", group: "platform" },
  { key: "platform.plans", label: "Manage plans & products", group: "platform" },
  { key: "platform.settings", label: "Platform settings", group: "platform" },
  { key: "platform.activity", label: "Audit activity", group: "platform" },
  { key: "platform.moderate", label: "Moderate listings", group: "platform" },

  { key: "business.profile.view", label: "View business profile", group: "business" },
  { key: "business.profile.manage", label: "Edit business profile", group: "business" },
  { key: "business.settings.manage", label: "Business settings", group: "business" },
  { key: "business.team.view", label: "View team", group: "business" },
  { key: "business.team.manage", label: "Manage team & roles", group: "business" },
  { key: "business.billing.view", label: "View billing & plan", group: "business" },

  { key: "website.view", label: "View public website", group: "website" },
  { key: "website.manage", label: "Edit public website", group: "website" },

  { key: "catalog.view", label: "View catalog / menu", group: "catalog" },
  { key: "catalog.manage", label: "Manage catalog / menu", group: "catalog" },

  { key: "orders.view", label: "View orders", group: "operations" },
  { key: "orders.manage", label: "Manage orders", group: "operations" },
  { key: "resources.view", label: "View resources", group: "operations" },
  { key: "resources.manage", label: "Manage resources", group: "operations" },
  { key: "bookings.view", label: "View bookings", group: "operations" },
  { key: "bookings.manage", label: "Manage bookings", group: "operations" },
  { key: "inventory.view", label: "View inventory", group: "operations" },
  { key: "inventory.manage", label: "Manage inventory", group: "operations" },

  { key: "services.view", label: "View services", group: "service" },
  { key: "services.manage", label: "Manage services", group: "service" },
  { key: "workflows.view", label: "View workflows", group: "service" },
  { key: "workflows.manage", label: "Manage workflows", group: "service" },
  { key: "tickets.view", label: "View tickets", group: "service" },
  { key: "tickets.manage", label: "Manage tickets", group: "service" },
  { key: "tickets.assign", label: "Assign tickets", group: "service" },

  { key: "customers.view", label: "View customers", group: "records" },
  { key: "customers.manage", label: "Manage customers", group: "records" },
  { key: "analytics.view", label: "View analytics", group: "records" },
  { key: "notifications.manage", label: "Manage notifications", group: "records" },
];

export const PERMISSION_GROUPS: { key: PermissionDef["group"]; label: string }[] = [
  { key: "platform", label: "Platform" },
  { key: "business", label: "Business & team" },
  { key: "website", label: "Website" },
  { key: "catalog", label: "Catalog" },
  { key: "operations", label: "Operations" },
  { key: "service", label: "Services & tickets" },
  { key: "records", label: "Customers & reporting" },
];

// ─── Roles ────────────────────────────────────────────────────────────────────

/** The three platform login roles stored on `User.role` today. */
export type PlatformRole = "SUPER_ADMIN" | "RESTAURANT_ADMIN" | "TRACKING_ADMIN";

/**
 * Business staff roles. Not yet a database column — they become real with the
 * `BusinessMembership` migration. Defined now so permission-aware code and the
 * role→permission map are stable across that change.
 */
export type StaffRole =
  | "OWNER"
  | "MANAGER"
  | "FRONT_DESK"
  | "WAITER"
  | "KITCHEN"
  | "TECHNICIAN"
  | "INVENTORY"
  | "ACCOUNTANT";

export type Role = PlatformRole | StaffRole;

export const PLATFORM_ROLES: PlatformRole[] = ["SUPER_ADMIN", "RESTAURANT_ADMIN", "TRACKING_ADMIN"];

export const STAFF_ROLES: StaffRole[] = [
  "OWNER",
  "MANAGER",
  "FRONT_DESK",
  "WAITER",
  "KITCHEN",
  "TECHNICIAN",
  "INVENTORY",
  "ACCOUNTANT",
];

/** Every permission an owner may exercise within their own tenant. */
const BUSINESS_PERMISSIONS: Permission[] = [
  "business.profile.view",
  "business.profile.manage",
  "business.settings.manage",
  "business.team.view",
  "business.team.manage",
  "business.billing.view",
  "website.view",
  "website.manage",
  "catalog.view",
  "catalog.manage",
  "orders.view",
  "orders.manage",
  "resources.view",
  "resources.manage",
  "bookings.view",
  "bookings.manage",
  "inventory.view",
  "inventory.manage",
  "services.view",
  "services.manage",
  "workflows.view",
  "workflows.manage",
  "tickets.view",
  "tickets.manage",
  "tickets.assign",
  "customers.view",
  "customers.manage",
  "analytics.view",
  "notifications.manage",
];

const SUPER_ADMIN_PERMISSIONS: Permission[] = [
  ...BUSINESS_PERMISSIONS,
  "platform.businesses",
  "platform.plans",
  "platform.settings",
  "platform.activity",
  "platform.moderate",
];

/**
 * Role → permission map. `RESTAURANT_ADMIN` / `TRACKING_ADMIN` are the existing
 * tenant owners, so they carry the full business set (product isolation is a
 * separate concern handled by feature/product access, not permissions).
 */
export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  SUPER_ADMIN: SUPER_ADMIN_PERMISSIONS,
  RESTAURANT_ADMIN: BUSINESS_PERMISSIONS,
  TRACKING_ADMIN: BUSINESS_PERMISSIONS,

  OWNER: BUSINESS_PERMISSIONS,
  MANAGER: [
    "business.profile.view",
    "business.team.view",
    "website.view",
    "catalog.view",
    "catalog.manage",
    "orders.view",
    "orders.manage",
    "resources.view",
    "resources.manage",
    "bookings.view",
    "bookings.manage",
    "inventory.view",
    "inventory.manage",
    "services.view",
    "services.manage",
    "workflows.view",
    "tickets.view",
    "tickets.manage",
    "tickets.assign",
    "customers.view",
    "customers.manage",
    "analytics.view",
    "notifications.manage",
  ],
  FRONT_DESK: [
    "business.profile.view",
    "catalog.view",
    "orders.view",
    "orders.manage",
    "resources.view",
    "bookings.view",
    "bookings.manage",
    "services.view",
    "tickets.view",
    "tickets.manage",
    "customers.view",
    "customers.manage",
  ],
  WAITER: [
    "catalog.view",
    "orders.view",
    "orders.manage",
    "resources.view",
  ],
  KITCHEN: ["orders.view", "orders.manage"],
  TECHNICIAN: ["services.view", "tickets.view", "tickets.manage"],
  INVENTORY: ["catalog.view", "inventory.view", "inventory.manage"],
  ACCOUNTANT: ["business.billing.view", "orders.view", "analytics.view"],
};

export function isPlatformRole(value: string | null | undefined): value is PlatformRole {
  return value != null && (PLATFORM_ROLES as readonly string[]).includes(value);
}

export function permissionsForRole(role: string | null | undefined): readonly Permission[] {
  if (!role) return [];
  return ROLE_PERMISSIONS[role as Role] ?? [];
}

/** Whether a role holds a permission. Unknown roles hold nothing (deny by default). */
export function hasPermission(role: string | null | undefined, permission: Permission): boolean {
  return permissionsForRole(role).includes(permission);
}

/** Whether a role holds at least one of the given permissions. */
export function hasAnyPermission(role: string | null | undefined, permissions: Permission[]): boolean {
  const owned = permissionsForRole(role);
  return permissions.some((p) => owned.includes(p));
}

/**
 * Resolve the role used for permission checks. A business-scoped staff role
 * (from `BusinessMembership`) wins inside that tenant; otherwise the platform
 * login role applies — legacy owners keep their full business access.
 */
export function effectiveRole(
  platformRole: string | null | undefined,
  staffRole?: string | null
): Role | null {
  return (staffRole as Role | undefined) ?? (platformRole as Role | undefined) ?? null;
}

/** Whether a role holds a permission, factoring in an optional staff override. */
export function hasEffectivePermission(
  platformRole: string | null | undefined,
  staffRole: string | null | undefined,
  permission: Permission
): boolean {
  return hasPermission(effectiveRole(platformRole, staffRole), permission);
}
