# AGENTS.md — QEVYRA repo guide for AI agents

> Read this first. Then read `docs/ARCHITECTURE_RULES.md` (binding) and, before touching anything, `docs/CURRENT_SYSTEM_AUDIT.md`.

## What this repo is

QEVYRA = multi-business digital platform. One repo, one app, one Postgres DB. Products are modules: **Order** (live), **Track**, **Website/Sites**.

**All new development happens in `qevyra/`** — the unified Next.js 16 + Prisma app. `modules/order/menu-saas` is the legacy deployed product; it stays working and is not where features are added.

## Golden rules (see ARCHITECTURE_RULES.md for the full list)

1. Never break the deployed product. `modules/order/menu-saas` is live — verify lint/typecheck/build before and after any change.
2. Working code > cosmetic restructuring. No unrequested refactors.
3. Modules never couple to each other; they use the platform core only.
4. `prisma/migrations/` is append-only. Never `db push` on production.
5. Never commit unless the user explicitly asks.
6. When uncertain about scope or data model, ask the user before writing code.

## Where things live

- `docs/` — architecture truth: audit (current), architecture (target), repo structure, migration map, rules, roadmap, DB evolution.
- `qevyra/` — **the app**. Unified Next.js 16 / Prisma / Postgres platform (own package.json, own prisma, own vercel.json). All new work goes here.
- `qevyra/docs/` — app-level truth: build plan (source of truth for current work), architecture, database, routing, modules, ops, track, website, sites.
- `modules/order/menu-saas/` — the legacy deployed product. Keep it working; do not add features to it.
- `modules/track/`, `modules/website/` — placeholder product folders (README only).

## Getting around the app

- Stack: Next.js 16.3.3 App Router, React 19.2.8, Tailwind v4, Radix UI, Prisma 6 PostgreSQL, NextAuth v5 (credentials + JWT), Zod 4, qrcode.react, web-push.
- Auth: `qevyra/src/config/auth.config.ts` (edge-safe), `qevyra/src/lib/auth.ts`, `qevyra/src/proxy.ts` (middleware). Guards: `qevyra/src/lib/auth-guard.ts` + `apiGuard`. Roles: SUPER_ADMIN / RESTAURANT_ADMIN / TRACKING_ADMIN.
- Plans: `qevyra/src/lib/plan-catalog.ts` (pure) + `qevyra/src/lib/plans.ts` (server). BRONZE / SILVER / STAR; GOLD deliberately unimplemented.
- Order core: `qevyra/src/lib/db.ts` (god-module — refactor is tracked, do NOT casually rewrite), `qevyra/src/lib/session-math.ts` (pure).
- Modules: `qevyra/src/modules/` — `track/` (services + catalog), `website/`, `sites/`, `inventory/`, `notifications/`. Route = guard → validate (Zod) → service → reply.
- Routes: public storefront `/s/[slug]`; legacy `/b/[slug]` and `/w/[slug]` redirect there. Customer QR app `/r/[restaurantSlug]/t/[tableToken]`. Track public `/track/[code]` (token-resolved). Admin `/admin`, `/track-admin`, platform `/super-admin`.

## Commands (run inside `qevyra/`)

- Install: `npm install`
- Dev: `npm run dev` (requires local Postgres via `docker-compose.yml`; copy `.env.example` → `.env`)
- Lint: `npm run lint`
- Typecheck: `npx tsc --noEmit`
- Build: `npm run build`
- Seed: `npx prisma db seed`
- Smoke: `node scripts/e2e-smoke.mjs` (needs a running dev server)
- DB local: `docker compose up -d db` then `npx prisma migrate dev`
- Prod migrations: `npx prisma migrate deploy`

## PR / change checklist

- [ ] Scoped to one stage axis (no mixed schema+refactor+brand changes)
- [ ] Lint + typecheck + build pass (and smoke where relevant)
- [ ] `docs/*` updated in the same change when structure/schema/rules change
- [ ] No secrets added; `.env*` untouched or only `.env.example`
- [ ] No commit made unless the user asked for it