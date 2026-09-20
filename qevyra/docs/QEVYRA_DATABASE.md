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
TRACK   Workflow, WorkflowStep, Ticket, TicketStatusHistory
```

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

- One migration per phase, generated with `npx prisma migrate dev` against local Postgres.
- Never edit shipped migrations. Append-only.
- Demo/seed data stays idempotent (`prisma/seed.ts`; verified rerunnable).