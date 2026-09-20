# QEVYRA Platform — Master Plan

> Status: **PLAN (not yet executed).** This document describes what we are going to build and how.
> Nothing in this doc is a claim that a feature already works — see [§7 Verified vs Planned](#7-verified-vs-planned).
> Construction happens in explicit phases, one axis per phase, verifying lint/typecheck/build after each.

## 1. What QEVYRA is

QEVYRA is a **multi-business digital platform**: one app, one PostgreSQL database, and a universal
`Business` tenant. Every business gets the same building blocks; the blocks they actually use are
decided by their subscription and the data they configure.

Three engines sit beside a shared core:

| Engine | What it gives a business |
| :--- | :--- |
| **QEVYRA Website** | A public business website (template + theme, no code). |
| **QEVYRA Order** | QR menu / ordering SaaS (restaurants, cafes, homestays). |
| **QEVYRA Track** | Ticket/job tracking SaaS (laundry, tailor, garage, repair). |

**Core** (not an engine): `Business` tenant, authentication, users, customers, subscriptions, QR
foundation, shared utilities.

## 2. The three public experiences

QEVYRA deliberately has **three separate public website experiences**. They must never be merged.

```
QEVYRA.com                    ← 1) Company website (ONE, represents QEVYRA itself)
    │
    ├─ b/{businessSlug}       ← 2) Each customer business's public website (template-driven)
    │     ├── View Menu        ──> 3) Order public menu  /r/{restaurantSlug}/t/{tableToken}
    │     │                        (and /r/{restaurantSlug} slug-level menu — planned)
    │     ├── Track Service    ──> 3) Track public page /track/{trackingCode}  (planned)
    │     └── (no button)            Normal business: website only, no fake service buttons
    │
    └─ /login, /inactive       ← Login / account states (core)
```

### 2.1 QEVYRA.com — the company website

- Represents **QEVYRA itself**, not a customer business.
- Contains: QEVYRA branding, About, Services (Website / Order / Track), Pricing/contact CTA,
  contact, client info where appropriate, and a login entry point.
- **No** restaurant-specific or garage-specific functionality lives here.
- Current state: the `/` landing page. Today it is a stale "MenuQR / Digital Menus & QR Ordering"
  marketing page (`src/app/(public)/page.tsx`, reads `MenuQR` brand). This is the page to rebuild.

### 2.2 Business public website — `b/{businessSlug}`

- Every business gets `QEVYRA/business-name`. This is the **presentation layer** of that business.
- Built from a **reusable template system**: themes, reusable sections/components, configurable
  content. **One template, one design system** — never a separate site per industry
  (no `RestaurantWebsite.tsx`, `GarageWebsite.tsx`, …).
- The template shows sections based on the Business row (name, logo, hero, about, services blurb,
  phone, WhatsApp, address, map, opening hours) + Website content (theme, hero, about, services,
  SEO) + enabled services (see §3).
- Service buttons are **derived from what the business actually uses**, never faked:
  - Order enabled (+ a Restaurant linked) → **View Menu** → Order public menu.
  - Order enabled + ordering feature → same button (menu page itself shows ordering).
  - Track enabled (+ a Workflow linked) → **Track Service** → Track public page.
  - Neither → **no service section**, plain professional business website.
- Current state: `b/[slug]` exists and renders a themed single-pager (`/b/demo-restaurant` verified
  returning 200 with demo content). It reads Business + Website. It does **not yet** derive service
  buttons from enabled modules — that wiring is planned (§4.1, Phase W2).

### 2.3 Public service pages (Order menu, Track tracking page)

- These belong to their engines, NOT to the website module.
- **Order public menu** exists today via `/r/{restaurantSlug}/t/{tableToken}` (table-scoped QR
  flow: menu → cart → order → confirmation). A **slug-level menu without a table**
  (`/r/{restaurantSlug}`) is planned so the website "View Menu" button and non-QR visitors have an
  entry (view-only for BRONZE; ordering handled through the existing table/session flow).
- **Track public page** `/track/{trackingCode}` is **planned** (schema exists: `Workflow`,
  `WorkflowStep`, `Ticket`, `TicketStatusHistory`; UI does not).

## 3. Services / subscriptions (source of truth: business + plan)

A business can have **Website, Order, and/or Track** enabled. They are not mutually exclusive and
are NOT chosen by `BusinessType`. Access is derived:

```
Business ──plan──> Plan ──features/limits──> EffectiveAccess (plans.ts getEffectiveAccess)
```

- `Business` carries `plan`, `subscriptionStatus`, expiry, `neverExpires`, `autoOff`.
- `Plan` rows carry `featureKeys` (JSON array or `ALL_CURRENT_FEATURES`) + `limitKeys` (JSON obj).
- `getEffectiveAccess()` → `features: Record<string,boolean>`, `limits`, `isStar`. Everything gates
  through this — nothing reads `business.plan === "X"` directly.
- Feature keys include `business_website` and `business_track` (plus Order keys: `digital_menu`,
  `ordering`, `table_ordering`, `order_management`, `kitchen_workflow`, `order_history`, `bookings`,
  `qr_tables`, …). STAR = all current + future features (auto-grant).

**Plan tiers (Order + platform):**
- **BRONZE** — view-only menu: QR → menu → view. No ordering. Website included.
- **SILVER** — view menu + order; order management; website included; (Silver covers QR ordering).
- **STAR** — founding/special plan: everything currently defined (Star grant).
- **GOLD** — do not launch, do not show in customer-facing pricing/UI. Architecture may stay ready
  (Plan rows have `isVisible`) but GOLD is absent from `PLAN_IDS`/`DEFAULT_PLAN_CONFIGS`.

**Track** gets the same centralized capability system (its own feature/limit keys — e.g.
`workflows` count, ticket features) via the shared plan pipeline. Track limits are planned to be
added to `LIMIT_CATALOG` (see QEVYRA_SUBSCRIPTIONS.md).

**Behavior rule:** admin screens show only what the subscription allows; server-side checks are the
real gate (never just hiding UI buttons).

## 4. How we build it — phases

Each phase is independent and ends with lint + typecheck + build green. Docs are updated in the SAME
change. No unrequested refactors. Never break the deployed product at `modules/order/menu-saas`
(which stays untouched as reference) or the working `qevyra` web app.

| Phase | Name | Work |
| :--- | :--- | :--- |
| **W1** | QEVYRA.com (company site) | Rebuild `/` landing as QEVYRA company site (branding, products: Website/Order/Track, pricing CTA, contact, login link). Keeps `/login`, `/inactive`. Presentation-only; no SaaS logic. |
| **W2** | Business website service wiring | Derive buttons from enabled modules: Query linked data (Restaurant exists? Workflow exists? features) → render View Menu / Track Service / none. One template for all business types. Add optional social/review links to the Business/Website model (planned schema change). |
| **O1** | Order slug-level menu | Add `/r/{restaurantSlug}` public menu page (no table token). BRONZE → view-only. SILVER/STAR → shows menu + CTAs that route into the existing table-session/cart flows. Reuse existing menu APIs/components. |
| **T1** | Track engine — public page | `/track/{trackingCode}` (and `b/{slug}/tickets` entry): business name, service type, current status, stepped timeline (Received → Processing → Ready → Completed), contact/WhatsApp button, uses `Ticket`/`WorkflowStep`/`TicketStatusHistory`. |
| **T2** | Track SaaS admin | Track admin under `/admin/track/…`: workflows/steps editor, service types, customers, create/update ticket, tracking code, status changes (writes `TicketStatusHistory`), subscription-aware (features + workflow/ticket limits). |
| **A1** | Core consolidation | Move shared logic (auth, subscription, QR helpers, activity) into `modules/core`; Order stays under `modules/order` facade over the existing `src/lib/db.ts` god-module (refactor tracked, proceed slice-by-slice only when a change needs it). |
| **A2** | Final audit + docs + handoff | Run the audit checklist (§6); update all `docs/*`.

Order of execution when we start: **W1 → W2 → O1 → T1 → T2 → A1 → A2** (each is a checkpoint commit).

## 5. Rules that stay binding (from the handbook)

1. Never break the deployed product; verify lint/typecheck/build before and after each change.
2. Working code > cosmetic restructuring. No unrequested refactors.
3. Modules never couple to each other; they use platform core only.
4. `prisma/migrations/` is append-only. Never `db push` on production.
5. Never commit unless the user asks.
6. When uncertain about scope or data model, ask the user before writing code.
7. WhatsApp is a **communication channel only** — never a store of state. All business/order/track
   state lives in PostgreSQL/Prisma. Do not store business state only in WhatsApp.
8. QR stays reusable: future types (business website QR, tracking QR) must be added to the shared QR
   capability, not hardcoded into one industry.
9. Multi-tenant: every query touching business data is scoped by `businessId`. Tenant isolation
   enforced server-side, verified by the audit.

## 6. Final audit checklist (run at A2, before handoff)

1. QEVYRA.com works (branded, product sections, login link).
2. A business website works for a restaurant, a service/track business, and a normal business.
3. Restaurant menu works via QR table flow and via slug-level menu.
4. Restaurant ordering works according to subscription (BRONZE view-only, SILVER+ can order).
5. Tracking pages work (`/track/{code}` shows ticket + timeline).
6. Track admin works (workflow, ticket create/update, status history).
7. Order admin works (`/admin/*`, unchanged behavior).
8. Business info flows correctly (Business → website).
9. Menu info flows correctly (Menu DB → public menu).
10. Tracking info flows correctly (Workflow/Ticket DB → tracking page).
11. Tenant isolation works (Business A cannot read Business B data) — verified by test queries.
12. Subscription permissions work (server-side enforced; UI hiding is not the gate).
13. No GOLD exposed anywhere.
14. No fake buttons (no View Menu without a restaurant, no Track Service without a workflow).
15. No unnecessary duplicated data (website consumes SaaS data; does not re-store it).
16. Documentation matches implementation.
17. Project structure + routes are easy to understand (docs: QEVYRA_ROUTING / MODULES / DATA_FLOW).

## 7. Verified vs Planned

Held to "do not claim something works unless you actually verified it". Legend:
**VERIFIED** = observed working in this repo. **EXISTS** = code present (may not be fully wired).
**PLANNED** = to be built.

| Item | Status |
| :--- | :--- |
| `/b/{slug}` public business website renders demo business (200, demo content) | VERIFIED (dev server smoke test) |
| QR table flow `/r/{slug}/t/{token}` (menu → cart → order) | VERIFIED (existing working product path) |
| Login page 200; unauthenticated `/admin` redirects to login | VERIFIED (dev server smoke test) |
| Seed idempotent; Business→Restaurant→owner→Website→Workflow MOMO linked | VERIFIED (DB queries after seed) |
| Subscription logic centralized in `plans.ts` (`getEffectiveAccess`, `canUse`, `enforceSubscriptionState`, `loadOperationalRestaurant`) | VERIFIED (code + tsc/build green) |
| Website editor `/admin/website` (theme picker, content sections, publish) + `/api/admin/website` | EXISTS (built, typecheck/build pass; editor UI itself smoke-tested) |
| `/b/{slug}` service-button derivation from enabled modules | PLANNED (Phase W2) |
| QEVYRA.com rebuild (company site) | PLANNED (Phase W1) — current `/` is MenuQR-branded |
| Slug-level menu `/r/{restaurantSlug}` | PLANNED (Phase O1) |
| Track public page `/track/{code}` | PLANNED (Phase T1) — DB schema exists |
| Track SaaS admin `/admin/track/*` | PLANNED (Phase T2) |
| `modules/core`, `modules/order` real folders | PLANNED (Phase A1) — only `modules/website` exists |
| GOLD hidden | VERIFIED (absent from PLAN_IDS/configs) |