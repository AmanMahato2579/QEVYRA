# QEVYRA — Database (Prisma / PostgreSQL)

The database is the source of truth. `prisma/migrations/` is append-only; never `db push` on
production.

## Ownership map (verified in prisma/schema.prisma)

```
CORE    Business, BusinessLocation, Product, BusinessProduct, User, Customer,
        BusinessCustomer, BusinessMembership, Plan, PlatformSetting, AdminActivity
WEBSITE Website, WebsiteTheme
ORDER   Restaurant, Category, MenuItem, MenuItemVariant, Table, TableSession,
        Order, OrderItem, OrderStatusHistory, OrderSequence, Notification,
        PushSubscription, BookableService, Booking, BookingStatusHistory
TRACK   Workflow, WorkflowStep, Ticket, TicketItem, TicketStatusHistory, WorkflowSequence
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
- Track codes: `Ticket.trackingCode` UNIQUE (e.g. `LAU-4821`) — human/staff reference only;
  `Ticket.publicToken` UNIQUE (high-entropy secret for public tracking); `Workflow @@unique(businessId,
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

## Applied 2026-10-14 — order/booking status history (`20261014141119_add_order_booking_status_history`)

Audit trails (build-plan gap 5), mirroring TRACK's `TicketStatusHistory`.

- `model OrderStatusHistory` — append-only (`orderId`, `fromStatus OrderStatus?`,
  `toStatus OrderStatus`, `note`, `createdAt`). Cascade-removed with the order. Indexes
  `(orderId)` and `(orderId, createdAt)`.
- `model BookingStatusHistory` — append-only (`bookingId`, `fromStatus BookingStatus?`,
  `toStatus BookingStatus`, `note`, `createdAt`). Cascade-removed with the booking.
- Rows are written in the **same transaction** as the status change so history can never drift
  from the entity: order create (`PENDING`), waiter order (`ACCEPTED`), order accept/reject route,
  `updateOrderStatus`, session close (`COMPLETED` via `createMany`), booking create (`PENDING`),
  and `updateBookingStatus`.
- **Additive only** — two new tables + two back-relations; no existing table or column altered.
  Retention is unchanged: `daily-reset` deletes the parent order/booking, cascading history.
- Deploy: `npx prisma migrate deploy` (never `db push` on production).

## Applied 2026-10-14 — ticket public token (`20261014152000_add_ticket_public_token`)

Closes the Track public-tracking enumeration hole (build-plan gap 6).

- `Ticket.publicToken` — `TEXT NOT NULL UNIQUE`. A 192-bit `base64url` secret
  (`crypto.randomBytes(24)`) generated per ticket and embedded in the customer QR/link.
  The migration backfills existing rows with `md5(random() || clock_timestamp() || id)`
  before setting `NOT NULL` (a backfill Prisma cannot generate itself).
- Public lookup (`getPublicTicket`) now resolves by `publicToken`. The sequential,
  guessable `trackingCode` (e.g. `MOMO-0001`) is staff/human reference only and is
  **never** sufficient to open a tracking page.
- Manual lost-link fallback `POST /api/track/lookup` requires `trackingCode` **plus** the
  phone number recorded on the ticket (normalised), and is rate-limited (`lib/rate-limit.ts`).
- Public payload (`PublicTicket`) drops internal `notes`; only customer-safe fields
  (name, item summary, status, workflow, business contact) are exposed.
- **Additive only** — one new column + unique index on `Ticket`; no other table altered.
- Deploy: `npx prisma migrate deploy` (never `db push` on production).

## Applied 2026-10-15 — inventory (`20261015135615_add_inventory`)

Build-plan gap 4. Tenant-scoped stock control for any business.

- `InventoryItem` — `businessId`, `name`, optional `sku`, `unit` (default `"unit"`),
  `currentStock DECIMAL(12,3)` (cached roll-up), `reorderThreshold DECIMAL(12,3)`,
  `isActive`. `@@unique([businessId, sku])` — blank SKUs are stored as `NULL` so
  multiple items without a code never collide; indexes on `(businessId)` and
  `(businessId, isActive)`.
- `InventoryMovement` — append-only ledger: `type` (`InventoryMovementType`:
  `RECEIVED`/`USED`/`WASTE`/`ADJUSTMENT`), signed `quantity` (the delta actually
  applied), `stockAfter` (resulting balance), optional `note`, optional `actorId`
  → `User` (`ON DELETE SET NULL`), `createdAt`. Indexes on `(businessId, createdAt)`
  and `(itemId, createdAt)`.
- Stock is never edited directly — `recordMovement` updates `currentStock` and
  writes the movement in one transaction, so the ledger and the cached balance stay
  in sync. Service `src/modules/inventory/services.ts`.
- API `/api/admin/inventory/items` + `/[itemId]` + `/[itemId]/movements`; UI
  `/admin/inventory`; nav gated on `inventory.view` / `inventory.manage`.
- **Additive only** — two new tables + one enum; no existing table altered.
- Deploy: `npx prisma migrate deploy` (never `db push` on production).

## Applied 2026-10-15 — outbound notifications (`20261015140835_add_notification_events`)

Build-plan gap 7. An honest, durable log of external messages (WhatsApp/SMS).

- `NotificationEvent` — `businessId`, `channel` (`NotificationChannel`:
  `WHATSAPP`/`SMS`/`EMAIL`), `status` (`NotificationDeliveryStatus`: `PENDING`/
  `SENT`/`FAILED`/`NOT_CONFIGURED`), `recipient`, optional `subject`, `body`,
  `provider` (adapter id), optional `refType`/`refId` (e.g. `ticket`),
  `error`, `attempts`, `sentAt`, timestamps. Indexes on `(businessId, createdAt)`,
  `(businessId, status)`, `(refType, refId)`.
- Written **before** any network call; if no provider is connected the row is
  `NOT_CONFIGURED` — there is no fake-success path. Provider adapters
  (`src/modules/notifications/providers.ts`) flip it to `SENT`/`FAILED` only after
  a real response.
- Wired in Track (`createTicket`/`advanceTicket`/`cancelTicket`) and Bookings
  (status route); shown read-only on `/admin/notifications`.
- **Additive only** — two enums + one new table; no existing table altered.
- Deploy: `npx prisma migrate deploy` (never `db push` on production).

## Applied 2026-10-15 — ticket line items (`20261015145054_add_ticket_items`)

Build-plan gap 10. Optional structured line items attached to a ticket.

- `TicketItem` — `ticketId` (FK → `Ticket`, `onDelete: Cascade`), `name`, optional
  `description`, `quantity INT default 1`, optional `unitPrice DECIMAL(10,2)`,
  optional `currency`, `sortOrder INT default 0`, `createdAt`. Indexes on
  `(ticketId)` and `(ticketId, sortOrder)`.
- Distinct from the free-text `Ticket.itemSummary`. Prices are optional and never
  invented: a line without `unitPrice` shows no amount, and a ticket total is only
  rendered when at least one line is priced. `currency` is stored per line (defaults
  to the linked restaurant's `Rs.` only when the caller supplies it).
- Tenant-scoped through the parent ticket's `businessId`; item CRUD
  (`addTicketItem`/`updateTicketItem`/`deleteTicketItem`) verifies ownership via the
  ticket relation. New-ticket items are created in the same transaction as the ticket.
- **Additive only** — one new table + back-relation on `Ticket`; no existing table altered.
- Deploy: `npx prisma migrate deploy` (never `db push` on production).

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