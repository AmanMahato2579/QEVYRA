# QEVYRA Architecture

> Companion to `QEVYRA_PLAN.md`. This is the **target** architecture; `QEVYRA_PLAN.md §7` records
> what currently exists. Binding rules of the architecture: see AGENTS.md and handbook §1.

## 1. Mental model

```
                        ┌──────────────────────────────┐
                        │        QEVYRA Platform       │
                        │   one monolith, one Postgres │
                        │       one universal tenant   │
                        │            Business          │
                        └──────┬──────────┬────────────┘
                               │          │
              ┌────────────────┘          └────────────────┐
              ▼                                              ▼
        ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
        │    Core      │   │   Engines:   │   │              │
        │ Business     │   │  Website     │   │  Order (QR)  │
        │ Auth/Users   │   │  Order SaaS  │   │  Track SaaS  │
        │ Subscriptions│   │  Track SaaS  │   │              │
        │ Customers/QR │   └──────────────┘   └──────────────┘
        │ Shared utils │
        └──────────────┘
```

**Invariant:** engines never talk to each other. Website reads engine data through core-owned
services; Order and Track are independent. All modules depend only on Core.

## 2. Three public experiences (separate concerns)

1. **QEVYRA.com** — company marketing site (one instance, platform-level).
2. **Business websites** — `b/{slug}`, template-driven presentation layer per business.
3. **Public service pages** — Order menu (`/r/…`) and Track page (`/track/{code}`).

The SaaS/admin systems are separate and are the **source of truth**; public websites are a
**view** over that data, never a duplicate store. The website must not re-implement Order or Track
business logic — it renders buttons and links that route into those engines.

## 3. Multi-tenant isolation

- `Business` is the universal tenant (1 per customer).
- Every tenant-owned query is scoped by `businessId` server-side.
- Global identity (customers) is separate from tenant-scoped membership
  (`Customer` + `BusinessCustomer`) so Business A can never read Business B's customers.
- Subscription/plan state lives on `Business` only. Order profile links via
  `Restaurant.businessId` (1:1 nullable, transition keeping `restaurantId` on order rows).

## 4. Tech stack (same as the working product)

Next.js App Router, TypeScript, Tailwind, Radix UI, Prisma + PostgreSQL, NextAuth v5 (credentials
+ JWT), Zod, server-side validation everywhere. Runs on the existing `qevyra` monorepo app; the old
`modules/order/menu-saas` app is a frozen reference (do not touch).

## 5. Where code lives (target)

| Layer | Location |
| :--- | :--- |
| Core | `src/lib/*` (plans, auth, activity, settings, prisma) → consolidating into `src/modules/core` in Phase A1 |
| Website engine | `src/modules/website/*` |
| Order engine | Order routes/APIs under `src/app/…`; domain logic in `src/lib/db.ts` (god-module, refactor tracked) → `src/modules/order` when slices move |
| Track engine | `src/modules/track/*` (new, Phase T1/T2) |
| Admin shell | `src/app/(business)/admin/**` (+ Track admin under `admin/track/**`) |
| Platform admin | `src/app/(superadmin)/super-admin/**` |
| Public pages | `src/app/(public)/**` |

Public routes are grouped under `(public)`, business admin under `(business)`, platform admin under
`(superadmin)` — same URLs as before, only folder grouping changed. See QEVYRA_ROUTING.md.