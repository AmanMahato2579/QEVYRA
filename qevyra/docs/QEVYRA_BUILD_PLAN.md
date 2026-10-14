# QEVYRA — Build Plan (source of truth)

> Implementation blueprint for extending QEVYRA into a configurable local-business
> operating platform. Derived from `PLATFORM_PRODUCT_AND_BUILD_SPEC.md` mapped onto the
> **existing** codebase. Reuse-first: extend, do not rebuild. Companion docs:
> `QEVYRA_ARCHITECTURE.md`, `QEVYRA_DATABASE.md`, `QEVYRA_ROUTING.md`, `CURRENT_SYSTEM_AUDIT.md`.

## 1. Principles

- Modular monolith: one app, one Postgres, one universal tenant (`Business`).
- Every industry difference is **data + configuration**, never a schema fork.
- Template-driven: the public website + admin modules are rendered from one catalog.
- Reuse working code; extend, do not rewrite. No module → module coupling.
- Full rules: `docs/ARCHITECTURE_RULES.md`, root `AGENTS.md`.

## 2. Reuse map (exists → keep)

| Spec area | Already in repo |
| :--- | :--- |
| Tenant + entitlements | `Business`, `Product`, `BusinessProduct` |
| Customers | `Customer` (global) + `BusinessCustomer` (tenant-scoped) — already privacy-correct |
| Auth | NextAuth v5, `auth-guard.ts`, `proxy.ts` |
| Plans/modules | `Plan` + `Product` + `plan-catalog.ts` |
| Public website | `Site` / `SiteHighlight` / `SiteItem` / `SiteAd` + `TemplateRenderer` + 15 sections |
| Catalog | `Category`, `MenuItem`, `MenuItemVariant` |
| QR / ordering | `Table`, `TableSession`, `Order`, `OrderItem`, `OrderStatusHistory`, `OrderSequence` |
| Booking | `BookableService`, `Booking`, `BookingStatusHistory` |
| Track | `Workflow`, `WorkflowStep`, `Ticket`, `TicketStatusHistory`, `WorkflowSequence` |
| Audit / notify | `AdminActivity`, `Notification`, push (VAPID) |

## 3. Gaps to build (additive)

1. `BusinessLocation` (multi-location) — **done** (`20261014113351_add_business_locations`).
2. Staff layer: `BusinessMembership` + staff roles — **done** (`20261014131620_add_business_memberships`; effective staff role flows through `permissions.ts` and the session).
3. Order/bill **transfer** (§7.5) — **done**. `transferTableSession` locks both `Table` rows, requires an active + unoccupied destination, and moves only `TableSession.tableId` (no line item/price/payment duplicated or deleted); route `POST /api/admin/tables/[tableId]/transfer`; audited via `AdminActivity` (`order_transferred`). No schema change.
4. `InventoryItem` + `InventoryMovement`.
5. `OrderStatusHistory`, `BookingStatusHistory` — **done** (`20261014141119_add_order_booking_status_history`). Append-only audit trails mirroring `TicketStatusHistory`; rows written in the same transaction as each status change (order create/accept/reject/session-close, booking create/status). Surfaced in the Orders admin (per-session History toggle, aggregated across the session's orders) and Bookings admin (per-booking History toggle) via the shared `StatusTimeline` component. No existing table altered.
6. Ticket security — **done** (security portion; `20261014152000_add_ticket_public_token`). Added `Ticket.publicToken`, a high-entropy 192-bit `base64url` secret embedded in the customer QR/link. The public `/track/[code]` page now resolves by token instead of the guessable sequential `trackingCode`, so jobs can no longer be enumerated. Public payload no longer exposes internal notes. Lost-link fallback `/api/track/lookup` requires the code **and** the phone number on file (verified) and is rate-limited. `track-admin` now shares the token link/QR. **Not done:** `TicketItem` (configurable per-ticket line items) — deferred to a later Suite B pass.
7. `NotificationEvent` + provider adapter (WhatsApp/SMS) with an honest "not connected" state.
8. One canonical public site route (consolidate the `/b/[slug]` template onto the `Site` engine).
9. `apiGuard` adoption — **done** for `/api/admin/*` and `/api/super-admin/*` (routes on `loadBusinessContext` kept as-is).

## 4. Page & function map

### 4.1 Public (anonymous)
| Route | Behaviour |
| :--- | :--- |
| `/{slug}` | Profile/home from `Site`: hero, highlights, story, hours, contact, socials, reviews, map. |
| `/{slug}/menu` | View-only catalog. **No checkout** (ordering only via QR/staff in MVP). |
| `/{slug}/services` | Public service list (Suite B). |
| `/{slug}/book` | Booking **request** only, when booking module is on and a resource is configured. |
| `/{slug}/track` + `/{slug}/track/{token}` | Secure lookup: high-entropy token, optional phone check, rate-limited, safe fields only. |
| `/{slug}/qr/{token}` | Contextual QR order/destination; server validates token ↔ business ↔ destination. |

### 4.2 Business admin (visibility = module × permission × runtime flag)
dashboard · profile/theme · modules · team · customers · menu · orders · resources · bookings ·
inventory · services · workflows · tickets · website & QR · analytics · billing.

### 4.3 Platform admin (`/super-admin`)
businesses · plans/products/entitlements · categories/templates · integrations · moderation · activity.

### 4.4 API
Route = guard → validate (Zod) → service → reply. All tenant ids derived from session/context,
never trusted from the client. Every mutation re-checks tenant, membership, permission, input, and
current→target state.

## 5. Template engine (the reusability core)

Promote `layouts.ts` section lists into a **section registry** (`{ id, title, appliesTo, requires, component }`).
Layout becomes data. Adding a business type = adding config and, at most, one section component —
never a new application.

## 6. Build order (thin end-to-end slices first)

1. **Foundation** — permissions / api-guard / navigation ✅, `BusinessLocation` ✅, super-admin routes on `superAdminGuard` ✅, nav catalog adopted in admin + track shells ✅, staff layer (`BusinessMembership` + `StaffRole`) ✅. **Phase 1 complete.**
2. Suite A slice — menu → public menu → QR order → staff status.
3. Booking slice — resource + availability + request/confirm + conflict safety.
4. Suite B slice — service types + workflow + ticket + secure tracking.
5. Templates & QR tools — data-driven sections; business/table/shop QR.
6. Notifications + inventory — manual share first; provider adapter later.
7. Plans / analytics / commercial controls.
8. Local discovery & advertising (only after real traffic).

## 7. Release gates (non-negotiable)

- Tenant isolation enforced server/DB-side; cross-tenant ID tampering impossible.
- Role authorization server-side (UI hiding is cosmetic only).
- Public tracking: high-entropy secret, rate limiting, no phone-only lookup, safe-field filtering.
- Zod validation on every mutating route; **no fabricated** integration success.
- Append-only migrations; no `db push` on production; secrets never committed.
- Each stage: lint + typecheck + build green (smoke where relevant).

## 8. Verification (run in `qevyra/`)

- `npm run lint` · `npx tsc --noEmit` · `npm run build`
- Local DB: `docker compose up -d postgres` (container `menu-saas-postgres`, DB `qevyra`), then `npx prisma migrate dev`
- Smoke: `node scripts/e2e-smoke.mjs` (needs a running dev server)
