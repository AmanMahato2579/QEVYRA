# QEVYRA

Multi-business digital platform — one repo, one app, one database. Businesses (restaurants, hotels, homestays, retail, services) get optional, combinable digital products sharing one tenant model and one codebase built from a working core.

## Products

| Product | Status | Live code |
| --- | --- | --- |
| **QEVYRA Order** — QR menu, ordering, bookings, billing | Live | `modules/order/menu-saas` |
| **QEVYRA Track** — place/venue digital usage (timer + push) | Placeholder | `modules/track` |
| **QEVYRA Website** — on-platform business website + QR landing | Placeholder | `modules/website` |

## Current state

- QEVYRA Order is deployed and working: Next.js 16 App Router, React 19, Prisma + PostgreSQL (Supabase), NextAuth v5, plan-based feature gating (BRONZE / SILVER / STAR), per-restaurant QR tables, customer ordering with server-side pricing, bookings, web-push notifications, Super Admin console.
- The existing product was relocated into the monorepo as `modules/order/menu-saas` without any code change. It remains a self-contained app.
- Track and Website are intentionally not yet implemented.

## Docs

| Doc | Purpose |
| --- | --- |
| `docs/CURRENT_SYSTEM_AUDIT.md` | The system as it actually is today |
| `docs/QEVYRA_ARCHITECTURE.md` | Target architecture and principles |
| `docs/QEVYRA_REPOSITORY_STRUCTURE.md` | Layout of the repo and its migration path |
| `docs/MIGRATION_MAP.md` | What is kept, moved, refactored, replaced — and when |
| `docs/ARCHITECTURE_RULES.md` | Binding rules for all engineering work (read before coding) |
| `docs/QEVYRA_ROADMAP.md` | Stages, scope, gates |
| `docs/DATABASE_EVOLUTION.md` | Current → transition → future schema |

`AGENTS.md` is the entry point for AI agents working in this repo.

## Quick start (local)

The only runnable product today is Order. See `modules/order/menu-saas/README.md` for setup. In short: `npm install`, copy `.env.example` → `.env.local`, `docker compose up -d db`, `npx prisma migrate dev`, `npm run dev`.

New business modules start as README-only placeholders under `modules/` and grow only through the roadmap stages. No new module ships without a `Business`-scoped data model and platform-core-only dependencies.