# QEVYRA Order

QR menu, digital ordering, table booking, and billing SaaS. This is the **live product** — the codebase QEVYRA was built on top of.

## Status

- **Deployed and working.** Do not break it.
- Located at `modules/order/menu-saas/` — a self-contained Next.js app with its own `package.json`, Prisma schema/migrations, `vercel.json`, and `.env.local`.

## Tenant scope

Order data is scoped to `Restaurant` (the ordering tenant). Future tenancy generalizes this to `Business` — see `docs/DATABASE_EVOLUTION.md`. Until then, all Order tables keep `restaurantId`.

## Entry point

Everything lives in `modules/order/menu-saas/`. See its `README.md` and the repo root `AGENTS.md` for run commands, guards, and change checklist.