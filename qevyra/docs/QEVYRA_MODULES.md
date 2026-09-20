# QEVYRA — Modules and Boundaries

> `QEVYRA_PLAN.md §7` lists what exists today (only `modules/website` is a real module folder).
> This doc defines the target boundaries and the bridge rules while code still lives in `src/lib`.

## Principles

1. A module owns one product axis (Website / Order / Track) or is Core.
2. Modules depend only on Core. Never on another module.
3. A module may expose a *facade* service used by the app or by the Website engine to render
   public entry points (e.g. `isOrderEnabled(business)`, `isTrackEnabled(business)`).
4. Don't move working code between folders as cosmetics. A slice moves only when the change that
   enables it lands in the same commit (handbook rule).

## Core (`modules/core` — target)

- **Business** universal tenant: identity, type, lifecycle, `isActive`.
- **Auth/authorization**: NextAuth, session (businessId), roles (SUPER_ADMIN / RESTAURANT_ADMIN),
  guards (`auth-guard.ts`), route groups.
- **Subscriptions**: `plans.ts` (`getEffectiveAccess`, `canUse`, `isBusinessOperational`,
  `enforceSubscriptionState`, `loadOperationalRestaurant`), `plan-catalog.ts` (pure).
- **Customers**: global `Customer` + tenant `BusinessCustomer`.
- **QR foundation**: shared QR generation/type routing (future: website QR, tracking QR, table QR).
- **Shared utils**: activity log, settings, prisma client.

## Website engine (`modules/website` — exists)

- Business website template + themes (`WebsiteTheme`) + content (`Website`).
- Public rendering `/b/{slug}`.
- Admin editor `/admin/website` + `/api/admin/website`.
- Service-button logic (derives which engine CTAs to render) — planned Phase W2.

## Order engine (`modules/order` — target; lives in `src/lib/db.ts` today)

- Restaurant profile, menu (categories/items/variants), tables + QR tokens, table sessions,
  orders + items + sequence, booking services/bookings, notifications, push subscriptions.
- Admin `/admin/**`; public QR flow `/r/{slug}/t/{token}/…`.
- Public slug menu `/r/{slug}` (planned Phase O1).
- Bridges tenant through `Restaurant.businessId` (transition keeps `restaurantId` on order rows).

## Track engine (`modules/track` — target; schema exists, code planned)

- `Workflow` + `WorkflowStep` (process definition + status steps, includes "ready" terminal step),
  `Ticket` + `TicketStatusHistory` (immutable lifecycle), tracking code generation.
- Track admin `/admin/track/**`; public page `/track/{trackingCode}`.
- Capabilities via core plan keys (`business_track`, workflow/ticket limits).

## Modules' current source of truth (reality today)

| Module | Reality today |
| :--- | :--- |
| core | `src/lib/plans.ts`, `plan-catalog.ts`, `settings.ts`, `activity.ts`, `auth.ts`, `auth-guard.ts`, `db.ts` (mixed) |
| website | `src/modules/website/services.ts` + `(public)/b/[slug]/page.tsx` + api/admin/website + admin/website |
| order | `src/lib/db.ts` god-module spanning ALL order/booking/notification queries (refactor tracked; do not casually rewrite) |
| track | DB models only (`Workflow`, `WorkflowStep`, `Ticket`, `TicketStatusHistory`) |