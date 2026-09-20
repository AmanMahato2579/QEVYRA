# QEVYRA

Multi-business digital platform — one app, one PostgreSQL database, one universal `Business`
tenant. Three engines beside a shared core: **QEVYRA Website**, **QEVYRA Order** (QR menu/ordering),
**QEVYRA Track** (service/job tracking).

## The three public experiences

```
QEVYRA.com                    Company website (ONE — represents QEVYRA)
  └─ b/{businessSlug}         Each customer's public website (one template, themed)
       ├─ View Menu    ──>    Order public menu   /r/{restaurantSlug}
       ├─ Track Service ──>   Track page           /track/{trackingCode}
       └─ (no buttons)        Normal business: website only, no fake service buttons
  └─ /login, /inactive        Auth / account states
```

Public websites are **views**; the SaaS/admin systems are the **source of truth**.

## Product modules

- **core** — Business tenant, auth, users, customers, subscriptions, QR foundation, shared utils.
- **website** — QEVYRA.com + business websites (template/themes/content editor).
- **order** — QR menu SaaS (menu, tables+QR, orders, bookings, notifications).
- **track** — tracking SaaS (workflows, tickets, tracking codes, status timeline).

Plans: **BRONZE** (view-only menu) · **SILVER** (menu + ordering) · **STAR** (founding/all
features) · **GOLD** is architecture-ready but deliberately never exposed.

## Repo layout

```
app/            (public) Company+business+menu+track pages · (business) admin · (superadmin) platform admin
modules/        module boundaries (website exists; core/order/track per plan)
components/     ui + shared + per-module components
lib/            prisma, plans (subscriptions), auth, settings, activity
prisma/         schema + append-only migrations + seed
docs/           architecture truth (read first: docs/QEVYRA_PLAN.md)
```

## Docs

Start with **`docs/QEVYRA_PLAN.md`** (master plan + phases + verified-vs-planned status). Then:
architecture, modules, routing, data-flow, website, order, track, subscriptions, database,
public-flows — all under `docs/QEVYRA_*.md`.

## Getting around / commands

- Install: `npm install`
- Dev: `npm run dev` (local Postgres via docker-compose; copy `.env.example` → `.env.local`)
- Lint: `npm run lint` · Typecheck: `npx tsc --noEmit` · Build: `npm run build`
- Migrate/seed: `npx prisma migrate dev` / `npx prisma db seed`
- Smoke: `node scripts/e2e-smoke.mjs`

Demo credentials (seeded): super admin `admin@qevyra.com`, demo owner `owner@demo.com`.