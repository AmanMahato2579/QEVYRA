# QEVYRA Order

QR menu, digital ordering, table booking, and billing SaaS. This is the **live product** — the codebase QEVYRA was built on top of.

## Status

- **Deployed and working.** Do not break it.
- Located at `modules/order/menu-saas/` — a self-contained Next.js app with its own `package.json`, Prisma schema/migrations, `vercel.json`, and `.env.local`.

## Tenant scope

Order data in this legacy app is scoped to `Restaurant` (the ordering tenant). The unified `qevyra/` app generalizes tenancy to `Business`; new Order-family tables there ship with `businessId`.

## Entry point

Everything lives in `modules/order/menu-saas/`. See its `README.md` and the repo root `AGENTS.md` for run commands, guards, and change checklist.