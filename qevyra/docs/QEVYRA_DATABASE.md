# QEVYRA — Database (Prisma / PostgreSQL)

The database is the source of truth. `prisma/migrations/` is append-only; never `db push` on
production.

## Ownership map (verified in prisma/schema.prisma)

```
CORE    Business, User, Customer, BusinessCustomer, Plan, PlatformSetting, AdminActivity
WEBSITE Website, WebsiteTheme
ORDER   Restaurant, Category, MenuItem, MenuItemVariant, Table, TableSession,
        Order, OrderItem, OrderSequence, Notification, PushSubscription,
        BookableService, Booking
TRACK   Workflow, WorkflowStep, Ticket, TicketStatusHistory, WorkflowSequence
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