# QEVYRA (app)

The unified QEVYRA application — one Next.js 16 app, one PostgreSQL database, one universal
`Business` tenant. Three product engines beside a shared core: **Website**, **Order**
(QR menu/ordering/booking), **Track** (service ticket tracking).

Repo-level docs live in `../docs/` (start with `../AGENTS.md` and
`../docs/ARCHITECTURE_RULES.md`). Operations runbook: `docs/QEVYRA_OPS.md`.

## Products

- **Website** — public storefront per business, rendered at `/s/[slug]` from the `Site`
  engine (bridges legacy `Website` content when no `Site` row exists).
- **Order** — QR table sessions, server-priced customer orders, per-item kitchen workflow,
  bill/close, bookings, notifications. Menu items can carry an inventory **recipe**
  (`MenuItemRecipe`: inventory item × qty per unit): accepting an order decrements stock,
  cancelling an item/quantity or rejecting an order restores it — best-effort bookkeeping
  through `src/lib/order-inventory.ts` that never blocks an order. The admin dashboard
  shows a low-stock widget fed by the inventory module.
- **Track** — configurable ordered workflows, tickets with line items, secure public
  tracking at `/track/[code]` (192-bit token, rate-limited code+phone fallback).

Plans: **BRONZE** (view-only menu) · **SILVER** (menu + ordering) · **STAR** (founding/all
features). **GOLD** is deliberately unimplemented.

## Repo layout

```
src/
  app/
    (public)/       landing, /b/{slug} (→ /s/{slug}), /r/... QR menu, /track, /login, legal
    (sites)/s/[slug]/  canonical public storefront (layout, menu, items, track)
    (business)/     /admin (Order+Website), /track-admin (Track)
    (superadmin)/   /super-admin platform console
    api/            admin/, customer/, super-admin/, auth/, cron/, health
  modules/          core, website, sites, order, track, inventory, notifications
  lib/              prisma, auth, auth-guard, api-guard, permissions, plans, db (order god-module), order-inventory (order→stock bridge)
  components/       ui + shared
prisma/             schema (42 models, 16 enums) + append-only migrations + seed
scripts/            prepare-db, e2e-smoke, backup/restore-db, daily-reset, seed-sites
docs/               QEVYRA_OPS.md (runbook)
```

Route = guard → validate (Zod) → service → reply. Tenant IDs always derive from
session/context, never from the client.

## Commands (run in `qevyra/`)

```bash
npm install                       # install
npm run dev                       # dev server (localhost:3000)
npm run lint                      # eslint
npx tsc --noEmit                  # typecheck
npm run build                     # prisma generate + next build
npx prisma db seed                # seed
npx prisma migrate dev            # local migration
npx prisma migrate deploy         # production migration
node scripts/e2e-smoke.mjs        # HTTP smoke (needs running dev server)
```

Local DB: `docker compose up -d db` (container `menu-saas-postgres`, database `qevyra`).
Stop the dev server before `npm run build` (Prisma engine DLL lock on Windows).

## Demo credentials (seeded)

- Super admin: `admin@qevyra.com` / `Admin123!`
- Restaurant admin: `owner@homestay.com` / `Qevyra@123!`
- Track admin (owner, per vertical): `owner@tailor.com`, `owner@motorgarage.com`,
  `owner@cleaning.com`, `owner@repairhub.com` / `Qevyra@123!`
- Staff: `staff@<vertical>.com` / `Qevyra@123!`

Full list: `prisma/seed.ts`.
