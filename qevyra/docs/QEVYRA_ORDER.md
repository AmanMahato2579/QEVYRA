# QEVYRA Order — Menu & Ordering SaaS

> Execution plan for the Order axis (Phase O1 in QEVYRA_PLAN.md). The QR-table ordering product is
> already working; Phase O1 adds the slug-level public menu and re-checks subscription gating.

## What Order manages (data + admin)

Restaurant profile, menu (categories, items, variants/options/add-ons), tables + QR tokens,
table sessions, orders + order items + order sequence, booking services + bookings,
notifications, push subscriptions, settings.

Source of truth: `src/lib/db.ts` (god-module) + `src/app/(business)/admin/**` +
`src/app/(public)/r/**`. Do not casually rewrite db.ts (refactor tracked, slice by slice only).

## Plan tiers (Order) — verified against plan-catalog.ts

| Tier | Capabilities | Notes |
| :--- | :--- | :--- |
| BRONZE | `restaurant_profile`, `digital_menu`, `menu_management`, `qr_tables` (limit 10) | View-only menu; NO ordering |
| SILVER | BRONZE + `ordering`, `table_ordering`, `order_management`, `kitchen_workflow`, `order_history` (qrTables 20) | Full ordering |
| STAR | ALL_CURRENT_FEATURES (auto-grant incl. future) + overrides | Founding plan (starNumber) |
| GOLD | — | Not in PLAN_IDS / configs; never exposed; architecture ready via Plan.isVisible |

Admin shows only subscribed features; server-side gating via `plans.ts` (`getEffectiveAccess`,
`canOrder`, `canUse`, `loadOperationalRestaurant`) is the real enforcement.

## Phase O1 — slug-level public menu `/r/{restaurantSlug}` (planned)

Why: the business website "View Menu" button and search/WhatsApp visitors should not need a table
QR token. Goal: menu page without a table token.

- BRONZE: read-only menu (no cart, no ordering).
- SILVER/STAR: menu shown; ordering flows reuse the existing table-session/cart wiring — a visitor
  without a table token gets a "choose how to order" entry (scan table QR / contact the
  restaurant) rather than a half-working cart; final interaction detail to confirm with the user
  before implementation.
- Reuse existing menu queries/UI from `/r/{slug}/t/{token}` where possible (no duplication).

Existing public flow (unchanged): `/r/{slug}/t/{token}` → menu/cart/order/bill/book + session.

## Definition of done (O1)

- `/r/demo-restaurant` opens a slug menu (200), BRONZE hides ordering, STAR/SILVER shows it with a
  sensible order entry.
- QR table flow still works unchanged (smoke: menu/cart/order render).
- lint + typecheck + build green; docs/QEVYRA_ORDER.md updated in same change.