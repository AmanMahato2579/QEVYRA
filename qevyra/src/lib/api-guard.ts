import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { ZodType } from "zod";
import {
  effectiveRole,
  hasAnyPermission,
  hasPermission,
  type Permission,
  type PlatformRole,
} from "@/lib/permissions";
import type { AdminUser } from "@/types";

// ─── Centralized API guard ────────────────────────────────────────────────────
// Every mutating/protected route handler starts here:
//
//   const g = await apiGuard({ permission: "orders.manage" });
//   if (g.error) return g.error;
//   const { user } = g;
//
// Tenant ids must still be derived from the session/context (never a client id
// alone). This guard establishes WHO (auth + role + permission); the service
// layer establishes WHICH tenant.

export function apiError(status: number, message: string, details?: unknown): NextResponse {
  return NextResponse.json(
    details === undefined ? { error: message } : { error: message, details },
    { status }
  );
}

export async function currentUser(): Promise<AdminUser | null> {
  const session = await auth();
  return (session?.user as unknown as AdminUser | undefined) ?? null;
}

export type ApiGuardOk = { user: AdminUser; error: null };
export type ApiGuardFail = { user: null; error: NextResponse };
export type ApiGuardResult = ApiGuardOk | ApiGuardFail;

export interface ApiGuardOptions {
  /** Require this single permission. */
  permission?: Permission;
  /** Require at least one of these permissions. */
  anyOf?: Permission[];
  /** Require one of these platform roles (e.g. SUPER_ADMIN only). */
  roles?: PlatformRole[];
}

export async function apiGuard(opts: ApiGuardOptions = {}): Promise<ApiGuardResult> {
  const user = await currentUser();
  if (!user) return { user: null, error: apiError(401, "Unauthorized") };

  // Staff membership overrides the platform role for what the user may do
  // inside their tenant; platform roles (SUPER_ADMIN) stay intact.
  const role = effectiveRole(user.role, user.staffRole) as string | null;

  if (opts.roles && !opts.roles.includes(role as PlatformRole)) {
    return { user: null, error: apiError(403, "Forbidden") };
  }
  if (opts.permission && !hasPermission(role, opts.permission)) {
    return { user: null, error: apiError(403, "Forbidden") };
  }
  if (opts.anyOf && !hasAnyPermission(role, opts.anyOf)) {
    return { user: null, error: apiError(403, "Forbidden") };
  }

  return { user, error: null };
}

/** Convenience: SUPER_ADMIN-only routes (platform admin). */
export function superAdminGuard(): Promise<ApiGuardResult> {
  return apiGuard({ roles: ["SUPER_ADMIN"] });
}

// ─── Body parsing ─────────────────────────────────────────────────────────────

export type BodyOk<T> = { data: T; error: null };
export type BodyFail = { data: null; error: NextResponse };
export type BodyResult<T> = BodyOk<T> | BodyFail;

/** Parse + validate a JSON request body, returning a 400 Response on failure. */
export async function parseBody<T>(req: Request, schema: ZodType<T>): Promise<BodyResult<T>> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return { data: null, error: apiError(400, "Invalid JSON body") };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { data: null, error: apiError(400, "Validation failed", parsed.error.flatten()) };
  }
  return { data: parsed.data, error: null };
}
