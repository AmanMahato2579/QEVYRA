# QEVYRA — Data Flow

Source of truth is the **SaaS/admin systems** (PostgreSQL + Prisma). Public websites are views.
No duplicate stores. WhatsApp is a channel only.

## Core flows

```
Business Admin / Super Admin
    └─ Writes Business + Plan + Website content (Postgres) ─┐
                                                            ▼
Business website  /b/{slug}  ──reads──> Business + Website (+ enabled-service flags)
```

## Order flows

```
Restaurant Admin (/admin/menu, /admin/tables, …)
    └─ writes Menu/Categories/Items/Tables (Postgres)
                                           │
                                           ▼
Public menu  /r/{slug}/t/{token}  ──reads──> Menu (+ cart → POST order)
    └─ customer order stored in Postgres (Order/OrderItem/TableSession)
                                           │
                                           ▼
Order dashboard (/admin/orders)  ──reads/updates──> Order status → statusChangedAt
    └─ push notification (web-push) — channel only, state stays in Postgres
```

Planned (Phase O1): `/r/{slug}` slug menu reads the same Menu data — no new store.

## Track flows

```
Track Admin (/admin/track, Phase T2)
    └─ Workflow/Steps + Ticket creation + status changes (Postgres, immutable history)
                                           │
                                           ▼
Public tracking page  /track/{code}  ──reads──> Ticket + WorkflowStep + Timeline
    └─ WhatsApp/Call button — channel only
```

Planned in T1: business website "Track Service" button links into `/track/…` entry; the website
module does NOT implement tracking logic.

## Subscription / capability flow

```
Business.plan ─> Plan.featureKeys/limitKeys ─> getEffectiveAccess() ─> features/limits
    (centralized in plans.ts; nothing gates on business.plan string directly)
```

## Tenant scoping invariant

All reads/writes of tenant data pass a `businessId` filter server-side. Never trust a client-supplied
id for ownership decisions.