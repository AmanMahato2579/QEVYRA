# QEVYRA Track — Status Tracking SaaS

> Execution plan for the Track axis (Phases T1 and T2). DB schema EXISTS; the UI/admin/API are
> planned. Nothing in this doc is claimed as working until phases complete.

## What Track is for

Businesses whose customers need to know the status of a service: laundry, cleaning, tailoring,
repair, garages, electronics. **One configurable engine**, not one app per industry.

## Data model (exists in prisma/schema.prisma — verified)

- `Workflow` — process definition per business (`codePrefix`, name, description, isActive).
- `WorkflowStep` — ordered steps; `isReadyStep` marks the terminal "ready/collect" step so a ticket
  timeline can show completion without guessing.
- `Ticket` — one job (`trackingCode` unique like `LAU-4821`, businessId, workflowId, customer
  name/phone, itemSummary, status, currentStepId, timestamps).
- `TicketStatusHistory` — immutable transition log (from/to step+status, note, createdAt).
- `TicketStatus` enum: PLACED → IN_PROGRESS → READY → COMPLETED (+ CANCELLED).
- Seeded demo data: `MOMO` workflow under the demo business (verified at seed).

## Phase T1 — public tracking page `/track/{trackingCode}` (planned)

Customer sees:
- Business name; tracking code; service/workflow name.
- Current status + stepped timeline:
  `✓ Received   ✓ Processing   ● Ready   ○ Completed`
- Relevant info (item summary, notes), contact business (phone / WhatsApp when enabled).

Rules: read-only from Ticket/Workflow/History; never mutates. `getPublicTicket(trackingCode)`
resolves ticket → business → workflow/steps → history. Not found → clear 404 ("invalid code").
Business website "Track Service" button (Phase W2) links here; the website module implements no
tracking logic.

## Phase T2 — Track SaaS admin `/admin/track/**` (planned)

Under the existing business admin shell (`(business)` group), tenant-scoped by `businessId`,
guarded like Order admin (auth → business active → subscription capability `business_track` +
limits). Screens:

- **Dashboard**: open tickets, status counts, recent activity.
- **Workflows**: create/edit workflow + steps (name, order, ready-step flag), choose code prefix.
- **Customers**: create/select customer (global Customer + BusinessCustomer link).
- **Tickets**: create ticket (workflow, customer, item summary) → auto tracking code; list/filter;
  update status/step (writes TicketStatusHistory immutably).
- **Settings/Subscription**: business info, plan state (shared via core).

API shape (planned): `/api/admin/track/workflows`, `/api/admin/track/tickets`,
`/api/admin/track/tickets/[id]/status` — all tenant-scoped, zod-validated, server-side owned.

## Boostrapping rules

- Use existing workflow/ticket models; add plans/limits for Track via core feature/limit keys
  (`business_track` already in catalog; planned additions: `workflows` count, ticket features —
  see QEVYRA_SUBSCRIPTIONS.md, decision with the user).

## Definition of done (T1+T2)

- `/track/MOMO-…`-style page shows timeline from seeded data (200).
- Track admin creates a ticket, moves its status, history rows appear.
- Tenant isolation: ticket queries always filtered by businessId (test: another business cannot
  read the ticket — verified via audit §6-11).
- lint + typecheck + build green; docs/QEVYRA_TRACK.md updated in same change.