# AGENTS.md — QEVYRA repo guide for AI agents

> Read this first. Then read `docs/ARCHITECTURE_RULES.md` (binding) and, before touching anything, `docs/CURRENT_SYSTEM_AUDIT.md`.

## What this repo is

QEVYRA = multi-business digital platform. One repo, one app, one Postgres DB. Products are modules: **Order** (live, at `modules/order/menu-saas`), **Track** and **Website** (placeholders, no code).

## Golden rules (see ARCHITECTURE_RULES.md for the full list)

1. Never break the deployed product. `modules/order/menu-saas` is live — verify lint/typecheck/build before and after any change.
2. Working code > cosmetic restructuring. No unrequested refactors.
3. Modules never couple to each other; they use the platform core only.
4. `prisma/migrations/` is append-only. Never `db push` on production.
5. Never commit unless the user explicitly asks.
6. When uncertain about scope or data model, ask the user before writing code.

## Where things live

- `docs/` — architecture truth: audit (current), architecture (target), repo structure, migration map, rules, roadmap, DB evolution.
- `modules/order/menu-saas/` — the working Next.js 16 / Prisma / Postgres app (own package.json, own prisma, own vercel.json).
- `modules/track/`, `modules/website/` — placeholder product folders (README only).

## Getting around the live product

- Stack: Next.js 16.3.3 App Router, React 19.2.8, Tailwind v4, Radix UI, Prisma 6 PostgreSQL, NextAuth v5 (credentials + JWT), Zod, qrcode.react, web-push.
- Auth: `src/auth.config.ts`, `src/lib/auth.ts`, `src/proxy.ts` (middleware). Roles: SUPER_ADMIN / RESTAURANT_ADMIN.
- Plans: `src/lib/plan-catalog.ts` (pure) + `src/lib/plans.ts` (server). BRONZE / SILVER / STAR; GOLD deliberately unimplemented.
- Order core: `src/lib/db.ts` (god-module — refactor is tracked, do NOT casually rewrite), `src/lib/session-math.ts` (pure).
- Customer app: `/r/[restaurantSlug]/t/[tableToken]`. Admin: `/admin`. Platform: `/super-admin`.

## Commands (run inside `modules/order/menu-saas`)

- Install: `npm install`
- Dev: `npm run dev` (requires local Postgres via `docker-compose.yml`; copy `.env.example` → `.env.local`)
- Lint: `npm run lint`
- Typecheck: `npx tsc --noEmit`
- Build: `npm run build`
- Smoke: `node scripts/e2e-smoke.mjs` (needs a running dev server)
- DB local: `docker compose up -d db` then `npx prisma migrate dev`

## PR / change checklist

- [ ] Scoped to one stage axis (no mixed schema+refactor+brand changes)
- [ ] Lint + typecheck + build pass (and smoke where relevant)
- [ ] `docs/*` updated in the same change when structure/schema/rules change
- [ ] No secrets added; `.env*` untouched or only `.env.example`
- [ ] No commit made unless the user asked for it