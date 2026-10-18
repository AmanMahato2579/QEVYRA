# QEVYRA

Multi-business digital platform — one app, one PostgreSQL database, one universal Business tenant.

## Products

- **QEVYRA Website** — Public business websites with configurable content, branding, and module CTAs.
- **QEVYRA Order** — QR menu, table sessions, customer ordering, kitchen/service workflows, bookings, and billing (live).
- **QEVYRA Track** — Service-business ticket/workflow tracking with secure public tracking links (live).

## Tech Stack

- **Next.js 16.3.3** (App Router, Turbopack)
- **React 19.2.8** + TypeScript 5
- **Prisma 6.19.3** + PostgreSQL
- **NextAuth v5** (credentials + JWT)
- **Tailwind CSS v4** + Radix UI
- **Zod 4**

## Repository Structure

`
.
├── AGENTS.md
├── docs/
│   └── ARCHITECTURE_RULES.md  # Binding engineering rules
├── modules/
│   ├── order/
│   │   └── menu-saas/          # Legacy deployed Order app (do not modify)
│   ├── track/                 # Placeholder
│   └── website/               # Placeholder
└── qevyra/                    # Unified Next.js app (source of truth)
    ├── prisma/
    ├── src/
    ├── scripts/
    └── docs/
`

Development happens in qevyra/. modules/order/menu-saas/ must remain working.

## Getting Started

All commands run from qevyra/:

`ash
cd qevyra
npm install
cp .env.example .env.local
`

Start local database (Docker):

`ash
docker compose up -d db
`

Apply migrations and run dev server:

`ash
npx prisma migrate dev
npm run dev
`

## Core Commands

`ash
npm run dev
npm run lint
npx tsc --noEmit
npm run build
npx prisma db seed
node scripts/e2e-smoke.mjs
`

## Documentation

- [AGENTS.md](./AGENTS.md) — AI agent instructions
- [docs/ARCHITECTURE_RULES.md](./docs/ARCHITECTURE_RULES.md) — Binding rules
- [qevyra/docs/QEVYRA_OPS.md](./qevyra/docs/QEVYRA_OPS.md) — Operations runbook

## License

Proprietary. All rights reserved.
