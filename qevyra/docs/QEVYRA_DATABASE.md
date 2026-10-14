# QEVYRA — Database (Prisma / PostgreSQL)

The database is the source of truth. `prisma/migrations/` is append-only; never `db push` on
production.

## Ownership map (verified in prisma/schema.prisma)

```
CORE    Business, BusinessLocation, Product, BusinessProduct, User, Customer,
        BusinessCustomer, BusinessMembership, Plan, PlatformSetting, AdminActivity
WEBSITE Website, WebsiteTheme
ORDER   Restaurant, Category, MenuItem, MenuItemVariant, Table, TableSession,
        Order, OrderItem, OrderSequence, Notification, PushSubscription,
        BookableService, Booking
TRACK   Workflow, WorkflowStep, Ticket, TicketStatusHistory, WorkflowSequence
SITES   Site, SiteHighlight, SiteItem, SiteAd
```

## Applied 2026-09-21 — atomicity/security hardening

Migrations `20260921123000_audit_atomicity_2026` and `20260921124500_order_service_charge`
(recorded in the real `qevyra` database along with baseline `20260920165056_qevyra_unified_baseline`):

- `User.tokenVersion Int @default(0)` — bumped on password reset / change to revoke all sessions.
- `Order.clientRequestId String?` + `@@unique([tableSessionId, clientRequestId])` — idempotent
  retries (duplicate → same order, not a second charge).
- `Order.serviceChargeAmount Decimal(10,2) @default(0)` — service charge stored per order (full
  atomic calc on create/update).
- `WorkflowSequence` (`workflowId @id`, `businessId`, `lastTicketNumber INT default 1000`) +
  `Workflow.sequence` back-relation — atomic ticket numbering (tickets start at 1000, mirroring
  OrderSequence's 1001).
- Indexes: `OrderItem(menuItemId)`, `TableSession(restaurantId, status)`,
  `TableSession(status, startedAt)`, `Booking(serviceId, bookingDate, status)`,
  `Ticket(businessId, createdAt)`, `Ticket(businessId, status)`, `Ticket(status, statusChangedAt)`,
  `Ticket(createdAt)`.
- Business rules now enforced in app code (not schema): session/table/row `FOR UPDATE` locks,
  guarded status transitions, row-locked close flows, delete guards (409 when history exists),
  DB-down from `/api/health`.

## Key invariants (already enforced)

- `Business` is the universal tenant; plan/subscription state lives on Business ONLY.
- `Restaurant.businessId` UNIQUE nullable 1:1 → Business (transition; order tables keep
  `restaurantId` during transition).
- Global customers (`Customer`) + tenant membership (`BusinessCustomer`, `@@unique(businessId,
  customerId)`) → isolation.
- Track codes: `Ticket.trackingCode` UNIQUE (e.g. `LAU-4821`); `Workflow @@unique(businessId,
  codePrefix)`; `TicketStatusHistory` immutable (append-only transitions).
- `Plan.featureKeys` JSON or `ALL_CURRENT_FEATURES`; `limitKeys` JSON (only `qrTables` defined today).

## Applied 2026-09-22 — product-activation model (`20260922164629_business_product_model`)

Introduces the functional subscription model decoupled from the legacy billing tiers:

- `enum ProductType` — `WEBSITE`, `MENU`, `ORDER`, `TRACK`, `TRACK_PRO`.
- `Product` — platform product catalog (id = ProductType), seeded from `plan-catalog.ts`. Each row
  carries the FULL flattened `featureKeys` set it unlocks and `limitKeys` defaults.
- `BusinessProduct` — tenant entitlement (`businessId`, `productId`, `isActive`,
  `@@unique([businessId, productId])`). Access in `plans.ts::getEffectiveAccess` is now derived
  from the union of a Business's ACTIVE products; legacy `Plan` rows (BRONZE/SILVER/STAR) remain
  only as a fallback for businesses without product rows.
- Migration backfills every existing Business with the product set matching its prior plan/type
  (STAR → all five; SILVER → Website+Menu+Order; track kinds → Website+Track; default →
  Website+Menu) and seeds the five catalog rows.

## Applied 2026-09-30 — sites foundation (`20260930071612_sites_foundation`)

Introduces the foundation tables for the `sites` module (Phase A public storefronts):

- `enum SiteType` — `GENERAL`, `TRACKING`, `MENU`.
- `model Site` — tenant-scoped storefront record (`businessId` required and unique FK to Business, `slug` unique, `type`, options: `enableItems`, `enableTrackOrder`, `enableAds`, `enableBooking`).
- `model SiteHighlight` — showcase highlights per site (`siteId`, `businessId`, `sortOrder`).
- `model SiteItem` — catalog items/dishes per site (`siteId`, `businessId`, `isActive`, `sortOrder`).
- `model SiteAd` — platform-wide catalog for sponsored inner page banners (`isActive`, `sortOrder`).

## Applied 2026-10-14 — business locations (`20261014113351_add_business_locations`)

First step of the multi-location foundation (Phase 1).

- `model BusinessLocation` — a physical place a business operates from (`businessId` FK,
  `slug` unique per business, `address`/`phone`/`mapUrl`/`openingHours`, `isPrimary`,
  `isActive`, timestamps). Table-scoped by `businessId`; unique `(businessId, slug)`.
- **Additive only** — creates the new table; no existing table was altered. Location-scoped
  `locationId` FKs (tables, rooms, stock, bookings, staff) are a deliberate later step once a
  consumer needs them, so this migration cannot break the live order product.
- Deploy: `npx prisma migrate deploy` (never `db push` on production).

## Applied 2026-10-14 — business memberships (`20261014131620_add_business_memberships`)

Staff layer (Phase 1) — business-scoped roles for logins.

- `enum StaffRole` — `OWNER`, `MANAGER`, `FRONT_DESK`, `WAITER`, `KITCHEN`, `TECHNICIAN`,
  `INVENTORY`, `ACCOUNTANT` (distinct from the three platform `UserRole`s).
- `model BusinessMembership` — links a `User` to a `Business` with a `StaffRole`
  (`@@unique([userId, businessId])`, `isActive`, timestamps; cascades from both).
- A user's effective permissions inside a tenant come from their active membership role;
  `User.role` remains the platform login role (backward compatible). Resolved by
  `permissions.ts::effectiveRole(platformRole, staffRole)` and applied in `apiGuard`
  (+ the session via `staffRole`).
- **Additive only** — new enum + new table; no existing table altered. Existing owners keep
  working with zero membership rows.
- Deploy: `npx prisma migrate deploy`.

## Planned schema changes (each needs a migration; decision with user at phase start)

Nothing is applied yet — listed for the upcoming phases.

1. **W2 — website social/review links.** Add to `Website` (or `Business`): `socialLinks String?`
   (JSON: {whatsapp, instagram, facebook}), `googleReviewUrl String?`, `googleReviewScore Decimal?`
   so normal businesses can show reviews on the template. Decide location when W2 starts.
2. **O1 — slug menu ordering entry.** Likely none is strictly required (reuse
   restaurants/menu/sessions); possible small field if "order without table" needs a mode.
   Reassess; prefer no schema change.
3. **T1/T2 — track limits.** No new tables needed (models exist). Possibly add Plan rows/limits
   (`workflows`, `activeTickets`) + `LIMIT_CATALOG` entries only.

## Migration discipline

- One migration per phase, append-only; never edit a shipped migration, never `db push` production.
- On Windows PowerShell `prisma migrate dev` needs a TTY; use instead:
  `npx prisma migrate diff --from-url <DATABASE_URL> --to-schema-datamodel prisma/schema.prisma --script`
  → save output as `prisma/migrations/<timestamp>_<name>/migration.sql` → `npx prisma migrate deploy`
  → `npx prisma generate`.
- Demo/seed data stays idempotent (`prisma/seed.ts`; verified rerunnable).