# QEVYRA — Current System Audit

> Audited repository: `modules/order/menu-saas/` — the existing, working QR Menu SaaS, i.e. the future **QEVYRA Order** product.
>
> This document describes the system as it actually is. Every claim was read from the repository during the Stage 0 foundation work.

---

## 1. Technology stack

| Concern | Choice | Evidence |
| --- | --- | --- |
| Framework | Next.js **16.3.3**, App Router (React 19.2.8) | `package.json` |
| Language | TypeScript 5 (strict) | `tsconfig.json` |
| Styling | Tailwind CSS v4 (`@tailwindcss/postcss`), Radix UI primitives, `lucide-react`, `class-variance-authority`, `clsx`, `tailwind-merge` | `package.json`, `postcss.config.mjs` |
| Database | PostgreSQL via **Prisma ORM 6.19.3** | `prisma/schema.prisma`, `docker-compose.yml` |
| DB hosting | Supabase (production / Vercel); local Docker Postgres 16 | `.env.example`, README |
| Auth | **NextAuth v5** (beta), Credentials provider, **bcrypt**, JWT sessions (30-day max age) | `src/lib/auth.ts`, `src/auth.config.ts` |
| Validation | **Zod 4** + `react-hook-form` + `@hookform/resolvers` | API routes, client forms |
| QR | `qrcode.react` (inline SVG) + `qrcode` (downloadable poster) | `src/app/admin/tables/TablesClient.tsx` |
| Push | `web-push` (VAPID) for owner notifications; service worker in `public/sw.js` | `src/lib/push.ts`, `public/sw.js` |
| Misc | `sharp`, PWA (`public/manifest.json`) | `package.json` |
| Deployment | Vercel (`vercel.json`: custom build prisma generate + prepare-db + build); self-hosted Docker runbook (`DEPLOYMENT.md`) | `vercel.json`, `scripts/prepare-db.mjs` |

> **Unused / legacy dependencies detected:** `@supabase/ssr` and `@supabase/supabase-js` are in `package.json` and Supabase env keys exist (`.env`, `.env.local`), but **nothing in `src/` imports Supabase** — no code path references it. `nanoid` is also unused. Candidates for later cleanup, not blockers.

---

## 2. Current folder structure (actual)

```
modules/order/menu-saas/
├── prisma/
│   ├── schema.prisma          # 16 models + 8 enums, PostgreSQL
│   ├── migrations/            # 20260916000000_init, 20260920000000_subscription_plans
│   └── seed.ts                # plan catalog + Super Admin + demo restaurant
├── public/
│   ├── manifest.json          # PWA ("MenuQR – Digital Ordering")
│   └── sw.js                  # push + notification click ONLY (no fetch / offline cache)
├── scripts/
│   ├── prepare-db.mjs         # Vercel build-time migration self-heal / baseline
│   └── e2e-smoke.mjs          # HTTP smoke test against a running dev server
├── src/
│   ├── auth.config.ts         # NextAuthConfig: JWT session, callbacks, cookie policy
│   ├── proxy.ts               # NextAuth middleware (route protection)
│   ├── app/
│   │   ├── layout.tsx         # root layout, PWA metadata, SW registration, ToastProvider
│   │   ├── page.tsx           # public marketing landing (MenuQR)
│   │   ├── error.tsx          # root error boundary
│   │   ├── inactive/          # deactivated-account page
│   │   ├── login/             # sign-in page
│   │   ├── admin/             # Restaurant Admin app: dashboard, menu, tables, orders,
│   │   │                      #   service/kitchen workspace, bookings, notifications, settings
│   │   ├── super-admin/       # platform owner app: overview, restaurants, plans, settings, activity
│   │   ├── r/[restaurantSlug]/t/[tableToken]/   # customer menu + cart/orders/bill/book
│   │   └── api/               # /api/admin, /api/customer, /api/super-admin, /api/auth
│   ├── components/            # ui/ (radix), admin/ (shell, modals, PWA), customer/
│   ├── hooks/                 # use-customer-lang (per-restaurant language override)
│   ├── lib/                   # 16 shared helpers (auth, plans, db, i18n, push, settings, ...)
│   └── types/                 # index.ts — shared client types
└── (root) .env files, docker-compose.yml, vercel.json, AGENTS.md, CLAUDE.md, DEPLOYMENT.md, README.md
```

Server components (no `"use client"`) do all data fetching; every data page exports `dynamic = "force-dynamic"`. Client components render interaction. "Real-time" is **3-second polling + `router.refresh()`** — no WebSocket, SSE, or Supabase Realtime in use.

---

## 3. Database architecture

One PostgreSQL schema with a single Prisma client singleton (`src/lib/prisma.ts`).

Models (`prisma/schema.prisma`):

- **User** — email (unique), bcrypt `passwordHash`, `role: SUPER_ADMIN | RESTAURANT_ADMIN | TRACKING_ADMIN`, optional `restaurantId` (menu product) or `businessId` (Track/Website tenants).
- **Restaurant** — the tenant. Profile (`name`, unique `slug`, `description`, `logoUrl`, `address`, `phone`, `currency`, `openingHours`, `language`, `brandColor`), billing (`taxRate`, `isTaxEnabled`, `serviceChargeRate`, `isServiceChargeEnabled`), `tableLimit`, `isActive`, `bookingsEnabled`, plan + subscription fields (see §10), star fields (`starNumber`, `starNote`), JSON overrides (`featureOverrides`, `limitOverrides`).
- **Table** — `restaurantId`, `tableNumber` (unique per restaurant), `qrToken` (unique — the QR value), `isActive`.
- **TableSession** — lifecycle for one table visit (`ACTIVE | CLOSED`), `customerName`, per-session `applyTax` / `applyServiceCharge` toggles, `startedAt`/`closedAt`. Orders hang off a session.
- **Category** — restaurant-scoped menu grouping (`sortOrder`, `isActive`).
- **MenuItem** — restaurant + category scoped; `price DECIMAL(10,2)`, `discountPercent`, `hasSpicyOption`, `hasNoteOption`, `requiresPreparation`, derived `foodType`, `isAvailable`, `sortOrder`.
- **MenuItemVariant** — optional priced variant per item (unique name per item), `foodType`.
- **Order** — `orderNumber` (per-restaurant sequence), `tableSessionId`, `customerToken`, `source: CUSTOMER | WAITER`, `status`, server-computed `subtotal`/`taxAmount`/`total`, `statusChangedAt`. Unique `(restaurantId, orderNumber)`.
- **OrderItem** — snapshot (`menuItemName`, `unitPrice`, `subtotal`, `isSpicy`, `note`), per-item lifecycle `NEW → PREPARING → SERVED | CANCELLED`, `servedQuantity` (partial serving), `cancelledReason`.
- **OrderSequence** — per-restaurant order-number counter (`lastNumber`, starts 1000).
- **Notification** — in-app inbox + push trigger (NEW_ORDER, NEW_TABLE_SESSION, ASSISTANCE_REQUEST, ORDER_STATUS, NEW_BOOKING), `read` flag.
- **BookableService** — bookable offering (`type: ROOM | POOL | TABLE_GAME | ADVENTURE | OTHER`, price, capacity, `venueCount`, slot-window fields).
- **Booking** — customer booking (contact name/phone, date `YYYY-MM-DD`, `startMinutes`, `durationMinutes`, guests, status machine), capacity-safe creation in a transaction.
- **PushSubscription** — VAPID web-push endpoints per restaurant.
- **Plan** — DB-driven editable plan catalog (`id` = BRONZE/SILVER/STAR, `featureKeys` JSON, `limitKeys` JSON, prices, `isVisible`, `isActive`). STAR = `["ALL_CURRENT_FEATURES"]`.
- **AdminActivity** — lightweight audit trail of Super Admin actions.
- **PlatformSetting** — key/value platform defaults (platformName, defaultTableLimit, defaultSubscriptionDays, newRestaurantNeverExpires, newRestaurantAutoOff).

Enums: `UserRole` (SUPER_ADMIN | RESTAURANT_ADMIN | TRACKING_ADMIN), `OrderStatus`, `OrderItemStatus`, `OrderSource`, `TableSessionStatus`, `NotificationType`, `BookableServiceType`, `BookingStatus`.

Migration history: `_init` baseline, `subscription_plans`, add `Website` (`website_additive`), `google_review_link` (Website.googleReviewUrl), and `tracking_admin_role` (UserRole gains TRACKING_ADMIN). `scripts/prepare-db.mjs` self-heals databases created via `prisma db push` during Vercel builds.

---

## 4. Authentication

- **NextAuth v5** (`src/lib/auth.ts`) with a single **Credentials** provider. No OAuth providers.
- `authorize()` looks up `User` by email, `bcrypt.compare`s the password, enriches the session with `role`, `restaurantId`, `restaurantSlug`, `restaurantName`.
- JWT session strategy (`src/auth.config.ts`): 30-day max age, day-based update window, httpOnly `authjs.session-token` cookie, `trustHost: true`.
- Sign-in page: `/login` (client form, `signIn("credentials", { redirect: false })`, role-based redirect).
- **Middleware** (`src/proxy.ts`): redirects logged-in users off `/login`; blocks `/admin` and `/super-admin` for anonymous users; blocks `/super-admin` for non-SUPER_ADMIN roles.

---

## 5. Authorization

- `src/lib/auth-guard.ts` provides page/server guards:
  - `requireAuth()` → redirect `/login`
  - `requireSuperAdmin()` → redirect `/admin`
  - `requireRestaurantAdmin()` → also loads the restaurant and redirects to `/inactive` when the subscription is non-operational.
  - `loadBusinessContext()` + `requireBusinessAdmin()` → resolve either client role (RESTAURANT_ADMIN or TRACKING_ADMIN) to their `Business` tenant with effective plan access; redirect `/inactive`.
- Roles: `SUPER_ADMIN` (platform), `RESTAURANT_ADMIN` (menu product tenant), `TRACKING_ADMIN` (Track product tenant — websites + live ticket tracking).
- Product routing via `src/lib/business-kind.ts`: TRACK-kind business types (TAILOR, DRY_CLEANING, GARAGE, CLEANING, REPAIR, SERVICE, RETAIL) own the Track product; MENU-kind (RESTAURANT, HOMESTAY, HOTEL, OTHER) own the QR-menu product. `src/proxy.ts` routes signed-in users to `/track-admin` (track) vs `/admin` (menu) and blocks cross-product access.
- The super admin manages each product from its own section: `/super-admin/tracking` (Track clients) vs `/super-admin/restaurants` (menu clients), backed by `PUT /api/super-admin/tracking/[businessId]`.
- API authorization is **ad-hoc** — the pattern `const session = await auth(); (session?.user as { role?, restaurantId? })` is repeated in every route handler. There is no centralized API guard for restaurants.
- All admin API queries scope Prisma by `restaurantId` from the session.

---

## 6. Restaurant (tenant) architecture

`Restaurant` is **already the tenant boundary**. Tables, categories, menu items, orders, sessions, notifications, bookings, and push subscriptions all carry `restaurantId`. The app is multi-tenant today: restaurant B cannot read restaurant A's rows because every admin query filters by the signed-in user's `restaurantId`. Server-side price/publish validation also filters by tenant (e.g. `buildOrderItems` in `src/lib/db.ts`).

Restaurant creation (`src/app/api/super-admin/restaurants/route.ts`) is one Prisma transaction: restaurant + owner user + N tables. Slug generation, star-number uniqueness, and subscription defaults come from `PlatformSetting`.

---

## 7. Menu architecture

- Tree: **Category → MenuItem → MenuItemVariant**, restaurant-scoped.
- Admin CRUD with drag-and-drop re-ordering (`MenuPageClient.tsx` — pointer-event DnD persisting `sortOrder` through reorder endpoints for categories, items, variants).
- `getPublicMenu()` (in `src/lib/db.ts`) returns only `isActive` categories and `isAvailable` items/variants for the customer app.
- `foodType` (VEG/NON_VEG/NONE) is **derived** from variants, not entered by the owner.
- Pricing is server-validated; when variants exist and base price is 0, base price auto-fills to the highest variant price.
- Availability toggling flips `isAvailable` on items/variants.

---

## 8. QR architecture

- **QR content = table URL**: `{NEXT_PUBLIC_APP_URL}/r/{restaurant.slug}/t/{table.qrToken}`.
- `Table.qrToken` is a unique `cuid()` (demo data uses readable tokens like `demo-table-1`).
- Rendering: inline `QRCodeSVG` on the admin Tables page; a **downloadable poster** (canvas, gradient, white card, "Powered by MenuQR") via the `qrcode` package.
- Access: `src/app/r/[restaurantSlug]/t/[tableToken]/page.tsx` validates restaurant slug + table token + `isActive` and renders the customer menu.
- The QR capability today is **restaurant/table-oriented** — not yet a generic platform capability.

---

## 9. Order architecture

The hub is `src/lib/db.ts` (~930 lines) plus `src/lib/session-math.ts` (pure, client-safe math).

- **Session**: guest scans → server page → guest presses Start (optional name) → `startTableSession()` creates an `ACTIVE` `TableSession` and fires a `NEW_TABLE_SESSION` notification. Waiters use `ensureTableSession()`.
- **Cart**: localStorage keyed per session (`cart_{sessionId}`); guest token `menuqr_customer_token` in localStorage.
- **Customer order** (`POST /api/customer/orders`): no auth, but the server re-validates session ownership and the `ordering` feature, and derives every price server-side in `buildOrderItems()` (tenant-filtered menu lookup, variant/price resolution, discount math). Tax computed server-side; order number from `OrderSequence`.
- **Waiter order** (`POST /api/admin/tables/[tableId]/orders`): `createWaiterOrder()` auto-accepts; instant items (`requiresPreparation = false`) start `SERVED`, cooked items start `NEW`.
- **Order lifecycle**: order-level status is intake-only `PENDING → ACCEPTED | REJECTED` (legacy READY/COMPLETED values are intentionally rejected by the route). Accepting auto-promotes that order's `NEW` items to `PREPARING`. Food progress is **per item**: `NEW → PREPARING → SERVED`, plus cancel-with-reason and partial serving (`servedQuantity`).
- **Pricing integrity**: `recomputeOrderTotals()` re-derives subtotal/tax/total from live, non-cancelled items whenever an item changes.
- **Retention**: COMPLETED/REJECTED orders retained exactly 24h anchored to `statusChangedAt`; filtered at query time, physically removed by `cleanupExpiredOrderHistory()` / `POST /api/admin/orders/cleanup` (cron note in `DEPLOYMENT.md`).
- **Billing**: `getSessionBill()` computes subtotal + tax + service charge (honoring session-level toggles). No online payment — "pay at the counter".

---

## 10. Subscription / plans architecture

Two files form the plan system:

- `src/lib/plan-catalog.ts` — **pure** (safe for client and server): `FEATURE_CATALOG` (10 features, groups menu/ordering/operations), `LIMIT_CATALOG` (`qrTables`), `PLAN_IDS = [BRONZE, SILVER, STAR]`, `DEFAULT_PLAN_CONFIGS`, `ALL_FEATURES_MARKER`, styling helpers, `describeSubscriptionState()`.
- `src/lib/plans.ts` — server logic over Prisma: `getEffectiveAccess()` (Plan row → feature/limit keys → customer `featureOverrides`/`limitOverrides` → effective access), `canOrder()`, `canBook()`, `effectiveTableLimit()`, `subscriptionOperational()`, `isRestaurantOperational()`, `enforceSubscriptionState()` (**lazy auto-off**: expired + `autoOff` → deactivate + flag EXPIRED on next visit; no cron required), `loadOperationalRestaurant()`.

**BRONZE** (view menu only), **SILVER** (+ ordering), **STAR** (first-10 founders, `ALL_CURRENT_FEATURES`). **GOLD is intentionally not implemented** — it appears only in a comment; legacy GOLD restaurants were migrated to STAR in the migration SQL.

Gate points today: table creation (limit), session start, customer order creation, waiter order creation, bookings. `requireRestaurantAdmin()` also blocks entry to `/admin` when non-operational.

---

## 11. Super Admin architecture

`/super-admin` (layout + pages):

- **Overview** — counts, plan breakdown, star founders, expiring/expired attention list, recent activity.
- **Restaurants** — create; activate/deactivate, bookings toggle, extend days (+30), star assign/remove, edit, reset password, delete.
- **Plans** — edit prices, feature keys (incl. the `ALL_CURRENT_FEATURES` marker), `qrTables` limit, visibility.
- **Settings** — platform name, table-limit default, subscription-day default, never-expires/auto-off defaults.
- **Activity** — audit log.

All `/api/super-admin/*` routes are `SUPER_ADMIN`-role gated and write `AdminActivity` audit rows.

---

## 12. Customer-facing architecture

Anonymous — no account, no login. Routes under `/r/[restaurantSlug]/t/[tableToken]`:

- **menu** — start-session gate, category browsing, item modal, sticky cart bar, assistance request, EN/NEP toggle (per-restaurant override), 20s session-liveness poll.
- **/cart** — quantity steppers, client totals, places order via API, clears localStorage cart.
- **/orders** — 3s poll of per-item status; rejected orders redirect back to the menu.
- **/bill** — static receipt; tax/service-charge rows only when enabled.
- **/book** — service picker, slot availability, booking creation with contact info; gated by `bookingsEnabled` + the `bookings` feature.

---

## 13. API architecture

App-Router Route Handlers grouped by consumer:

- `/api/admin/*` — restaurant admin: menu (categories/items/variants + reorders), tables (+ session charges, close session, waiter orders), sessions (overview, close), orders (status, cleanup), order-items (status/serve/quantity), bookings (+ services, status), notifications (list/mark-read), push (subscribe), restaurant (profile/settings update, statistics).
- `/api/customer/*` — sessions (start/liveness), orders (create/list), bookings (create, availability), loyalty/assist where present.
- `/api/super-admin/*` — restaurants CRUD + lifecycle actions, plans CRUD, settings, dashboard stats, activity.
- `/api/auth/*` — NextAuth.

**Observations**: no shared API request-validation helper (Zod inline per route); response shape is ad-hoc per route; restaurant-scoped API reads use the session id directly.

---

## 14. Dependencies & footprint

- `package.json` checked for runtime deps actually imported: Next, React, NextAuth, Prisma client, Zod, react-hook-form + resolvers, qrcode.react, qrcode, web-push, sharp, Radix UI shells, cva/clsx/tailwind-merge, lucide-react.
- Unused: `@supabase/*`, `nanoid` (see §1). No test framework; only `scripts/e2e-smoke.mjs`.
- The repo keeps working-tree deltas from pre-move work (uncommitted subscription/plans changes were present at move time).

## 15. Coupling, tech debt & known issues

1. **Hard-coded brand "MenuQR"** in marketing page, customers pages, posters, manifest, metadata — while the `platformName` setting exists but is unused at runtime. Cross-cutting rename needed for QEVYRA.
2. **Orphaned duplicate `src/components/admin/TablesClient.tsx`** — the live one is `src/app/admin/tables/TablesClient.tsx`. The orphaned copy risks divergence (actual code in it was older).
3. **No centralized API guard for restaurant admins**; auth+role+tenant checks are repeated inline per route (§5). Error-prone for new modules.
4. **Ownership gap found**: `GET /api/customer/sessions/[sessionId]/orders` lacks a restaurantId ownership check (the POST path enforces it). Low blast radius (inherit id knowledge + customer token), but the pattern must be unified.
5. **Polling-based realtime** (3s/20s intervals + `router.refresh()`). OK for current scale; will not scale to QEVYRA Track push-style updates without re-architecture.
6. **No automated tests** for order math or plan logic. Only an HTTP smoke script. Non-trivial refactors ship untested.
7. **`src/lib/db.ts` is a god-module (~930 lines)** mixing menu, sessions, orders, billing, bookings, cleanup. Refactor target in §18.
8. **No Dockerfile** despite `docker-compose.yml` + `DEPLOYMENT.md` (deploy docs cover Vercel + manual node).
9. NextAuth beta version pinned; v5 final or alternatives would need a deliberate upgrade pass.
10. Order status machine intentionally narrowed to intake-only; legacy `READY`/`COMPLETED` values rejected at the route — documented behavior, keep.

## 16. Reusable building blocks worth preserving

- `src/lib/plan-catalog.ts` + `src/lib/plans.ts` — pure catalog + server enforcement; the model for future capability-based access.
- `src/lib/session-math.ts` — pure client-safe math (totals, charges).
- `src/lib/i18n.ts` + `src/hooks/use-customer-lang.ts` — per-restaurant EN/NEP override; future locale layer seed.
- `src/lib/notifications.ts` + `src/lib/push.ts` — in-app inbox + VAPID web-push; reusable by Track.
- `src/lib/activity.ts` — AdminActivity audit writes; reusable as a `PlatformLog` seed.
- `src/lib/settings.ts` — PlatformSetting getter with cache; seed for platform config service.
- Tenant-lookup pattern + `loadOperationalRestaurant()` — the basis for the future `Business` isolation layer.
- `scripts/prepare-db.mjs` — DB self-heal/baseline; keep as-is.

## 17. Code we must never touch casually

- `prisma/migrations/*` (append, never edit) and `scripts/prepare-db.mjs`.
- Anything inside `src/lib/prisma.ts`, auth wiring (`src/auth.config.ts`, `src/lib/auth.ts`, `src/proxy.ts`).
- The customer ordering transaction path (`buildOrderItems`, order creation, `OrderSequence`) — money math.
- Existing enums and their DB meaning (retaining data > renaming).

## 18. Future refactors already identified (do NOT do in Stage 0)

- Split `src/lib/db.ts` into domain modules (menu, sessions, orders, bookings, billing).
- Introduce centralized API guards + Zod validation helpers.
- Real-time via SSE/WebSocket for kitchen/waiter views (deferred to a later stage).
- Brand/rename MenuQR → QEVYRA-wide constants; migrate `platformName` usage.
- Replace polling cart totals with authoritative server snapshots; unify ownership checks.
- Add test framework + unit tests around plan-catalog math and order math.
- Adopt invariant-based DB constraints (CHECK constraints) for order math where Prisma supports it.

## 19. QEVYRA risks mapped to the current system

| Risk | Today | Stage-1+ guard |
| --- | --- | --- |
| Breaking the only working product | Moderate (god-module, untested math) | Preserve `modules/order/menu-saas` untouched; verify lint/build; stage changes via docs only |
| Tenant isolation drift | Low, but inline guards | Centralized `Business`+tenant guard in future |
| Scale of polling realtime | Low | Track/WhatsApp bring SSE/WS later |
| Locked brand | High friction for rebrand | Central `platformName` on roadmap |
| Supabase left-overs | Confusion only | Clean in a dedicated housekeeping stage |