# QEVYRA Track — Status Tracking SaaS

> Status: **T1 + T2 implemented** (public tracking page + Track admin + tenant-scoped APIs).
> Earlier "planned" notes below are now descriptions of the shipped behaviour.
> Always re-verify against `docs/CURRENT_SYSTEM_AUDIT.md` before changing.

## What Track is for

Businesses whose customers need to know the status of a service: laundry, cleaning, tailoring,
repair, garages, electronics. **One configurable engine**, not one app per industry.

## Data model (prisma/schema.prisma — unchanged by this work)

- `Workflow` — process definition per business (`codePrefix`, name, description, isActive) with
  `@@unique([businessId, codePrefix])` so prefixes are unique per tenant.
- `WorkflowStep` — ordered steps; `isReadyStep` marks the terminal "ready/collect" step so a ticket
  timeline can show completion without guessing.
- `Ticket` — one job (`trackingCode` unique like `FIT-0001`, businessId, workflowId, customer
  name/phone, itemSummary, status, currentStepId, timestamps, completedAt).
- `TicketStatusHistory` — immutable transition log (from/to step+status, note, createdAt).
- `TicketStatus` enum: PLACED → IN_PROGRESS → READY → COMPLETED (+ CANCELLED).

## Module (server-owned, `src/modules/track/`)

- `services.ts` — `TrackError`, `normalizeCodePrefix`, `buildTrackingCode`, workflow CRUD
  (`getWorkflows`/`getWorkflow`/`createWorkflow`/`updateWorkflow`/`deleteWorkflow`), ticket ops
  (`createTicket`/`advanceTicket`/`cancelTicket`/`listTickets`/`getTicketCounts`/`getTicketDetails`/
  `getPublicTicket`). Every query is filtered by `businessId`. Ticket actions write history rows in
  a transaction.
- `catalog.ts` — pure, client-safe `TRACK_STATUS_META`, `trackStatusMeta()`, `WORKFLOW_LIMIT_KEY`,
  `TicketAction`. No server imports (safe in client components).

## Phase T1 — public tracking page (implemented)

- `/track` — lookup landing (inputs a code, redirects to `/track/{CODE}`); reads `?business=` to
  greet the visitor by business name (used by "Track Service"/"Track your order" buttons on
  business websites).
- `/track/[code]` — live status page: business name, tracking code, workflow name, status, stepped
  timeline (history chips), item summary/notes/customer, contact (WhatsApp + call + business
  website), and a QR that encodes the live URL. Dark themed via `data-brand` + `menu-hero-gradient`.
  `TicketLive.tsx` polls by `router.refresh()` every ~6s so progress shows in near-real-time.

Rules: read-only from Ticket/Workflow/History; never mutates. Not found → clear 404. Tenant-safe
(`getPublicTicket` resolves by tracking code only — codes are globally unique).

## Phase T2 — Track SaaS admin (implemented)

Guarded by `requireBusinessAdmin` (redirects `/inactive`) + subscription capability
`business_track` (`getEffectiveAccess`/`canUse`); workflow creation respects the `workflows` plan
limit (BRONZE 1 / SILVER 2 / STAR 10). Nav item "Track" appears only when the capability is active.

- `/admin/track` — **Workflows**: create/edit/delete workflow + steps (name, order, ready-step
  flag), choose code prefix (normalized, unique per business); delete refused while tickets exist;
  shows workflow → ticket counts, active toggle, plan limit counter.
- `/admin/track/tickets` — **Tickets**: new-ticket form (workflow, customer name/phone, item
  summary, notes) → auto tracking code; status filter chips (PLACED / IN_PROGRESS / READY /
  COMPLETED / CANCELLED); per-ticket actions advance (next step / READY / COMPLETED) and cancel;
  copy tracking code + QR toggle.

APIs (all tenant-scoped via `loadBusinessContext`, zod-validated, 403 without capability,
429 over workflow limit, 409 on duplicate code prefix):
- `GET|POST /api/admin/track/workflows`, `PATCH|DELETE /api/admin/track/workflows?id=`
- `GET|POST /api/admin/track/tickets` (`?status=` filter)
- `PATCH /api/admin/track/tickets/[id]` `{ action: "advance" | "cancel" }`

Deviation from the original plan: tickets capture customer name/phone inline rather than a
global `Customer`/`BusinessCustomer` link (schema doesn't require it and the admin flows the seed
data). Revisit only if cross-business customer history is required product.

## Seeded demo data

- `MOMO` workflow (demo restaurant): tickets `MOMO-0001` (IN_PROGRESS, "Preparing", 2 history rows)
  and `MOMO-0002` (PLACED).
- **Sita's Tailoring** — a track-only tenant (no Restaurant/menu): published Website (theme-royal),
  `FIT` "Garment stitching" workflow (4 steps, ready-step "Ready for pickup"), ticket `FIT-0001`
  (IN_PROGRESS at "Stitching"). Proves the universal tenant (Website + Track without ORDER).

## Definition of done (verified)

- [x] `/track/FIT-0001`, `/track/MOMO-0001` return 200 with timeline from seeded data; bad code → 404.
- [x] Track admin creates a ticket, advances/cancels, history rows written transactionally.
- [x] Tenant isolation: every ticket/workflow query filtered by `businessId` (workflows API 404s for
      other tenants; `getPublicTicket` uses globally-unique codes).
- [x] lint + typecheck + build green; `npm run build` lists `/track`, `/track/[code]`,
      `/admin/track`, `/admin/track/tickets`; e2e smoke 34/34.