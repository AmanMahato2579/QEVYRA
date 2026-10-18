# QEVYRA Implementation Execution Plan

**Purpose:** finish the product coherently and safely after the audit. This is the execution plan for implementation; it does not itself authorize schema or application changes.  
**Scope:** unified `qevyra/` app only. The deployed legacy app remains untouched.  
**Source documents:** `PRODUCT_LOGIC_AND_COMPLETENESS_AUDIT.md`, `PRODUCT_UI_AND_PLATFORM_MODEL_PLAN.md`, `qevyra/docs/QEVYRA_BUILD_PLAN.md`, `docs/ARCHITECTURE_RULES.md`.

## 1. Delivery rules

1. One phase has one purpose. Do not combine schema migration, authorization redesign, visual redesign, and feature work in the same pull request.
2. No product claim, button, or super-admin control ships unless it changes real server-side behavior.
3. No route trusts a client tenant ID, role, price, product grant, or record ownership.
4. A public website renders live module data; it never becomes a second database for menus, bookings, or tickets.
5. Existing working Order behavior is preserved. All migrations are additive and append-only.
6. Every phase finishes with lint, typecheck, build, focused authorization/tenant tests, and documentation updates. A phase that fails its exit gate does not begin the next phase.
7. No commit, deployment, destructive cleanup, or production migration occurs without explicit user instruction.

## 2. Decisions that must be approved first

These decisions materially affect schema and commercial behavior. They must be recorded before Phase 2 or later begins.

| Decision | Recommended answer | Why it matters |
|---|---|---|
| First sellable offers | Digital Presence; Restaurant Menu/Operations; Service Tracking. Add Booking Venue only after generic Booking is complete. | Prevents selling unsupported hotel/futsal/swimming workflows. |
| Website authority | Keep and evolve `Website` as the one editable website model; migrate/retire `Site` from the tenant-facing path. | It already has the owner editor; leaving both models guarantees stale public data. |
| Entitlement authority | Code-defined product catalog; business-level product grants and limits; database offer/subscription records for commercial terms. | Avoids editable Product/Plan controls that runtime code ignores. |
| First membership scope | One active business per user for the first release; model multiple memberships but add a selector only when needed. | Enables correct revocation/RBAC without an unfinished multi-tenant switcher. |
| Payments | Counter settlement only; no online payment claim. | Avoids a false financial workflow. |
| Retention | Define legal/commercial retention before deletions; do not keep the current 24-hour/7-day defaults blindly. | Enables reports, support, disputes, and audit trails. |

## 3. Phase 0 — Baseline and safety contracts

**Goal:** establish repeatable proof before changing behavior.

### Work

- Record current route inventory, roles, public URLs, tables, and enabled modules in test fixtures.
- Add test accounts/fixtures for Superadmin, Owner, Manager, Waiter, Kitchen, Technician, and two isolated businesses. Never commit real credentials.
- Document current public URL contracts: `/s/[slug]`, `/r/[slug]`, table QR, and `/track/[token]`.
- Make build verification reliable on the workstation: identify the Prisma DLL process lock without terminating user processes; then run the normal gates.
- Define phase-level smoke scenarios before code changes.

### Exit gate

- A clean local verification command set is documented and works: lint, typecheck, build, migration validation, and focused smoke tests.
- The test matrix can prove tenant A cannot access tenant B and staff cannot perform owner-only actions.

### Do not do

- Do not change schemas, UI, module navigation, or plans in this phase.

## 4. Phase 1 — Stop false, misleading, and unsafe public behavior

**Goal:** remove behaviour that actively misleads customers or leaks data, without changing the domain model.

### Work

1. Remove the fake `/s/[slug]/track` demo from published websites. Replace it with either the real Track lookup flow or no tracking CTA until Track is enabled and ready.
2. Disable/redesign public booking-history endpoints so a phone number is never an ownership proof. Do not return full Booking records publicly.
3. Correct public copy:
   - replace “pay via QR” with “order at the table; settle at the counter”;
   - remove “history resets nightly”;
   - remove unverified hard-coded live demos and the invalid `track?business=` path;
   - make prospect CTA “Talk to us / Request setup,” with Login secondary.
4. Hide or label as unavailable every control that currently does not affect runtime behavior, especially editable product feature/limit settings and restaurant table limit settings.
5. Add a visible empty/readiness state for module CTAs: no booking resource, no Track workflow, or no menu means no public CTA.

### Acceptance tests

- A published Track site cannot fabricate a found ticket.
- A public visitor cannot retrieve booking history with only business/table identifier plus a phone number.
- Every public CTA reaches a valid route and represents a real feature.
- Home-page/package wording contains no payment or unsupported vertical claim.

### Rollback

- Route/CTA removals are reversible code changes; no data migration is needed.

## 5. Phase 2 — Authentication, active membership, and RBAC

**Goal:** make the server authoritative for who may act in which business.

**Migration axis:** membership/authorization only. No website or booking schema work in this phase.

### Design

```text
Authenticated user identity
        ↓
Active BusinessMembership (active, tenant, staff role)
        ↓
Effective permission
        ↓
Tenant-scoped service call
```

### Work

1. Backfill/verify an active Owner membership for every existing tenant owner before enforcing memberships. Preserve `User.businessId`/`restaurantId` as a temporary legacy bridge.
2. Make protected requests resolve an active membership server-side (or a short-lived revocable equivalent), not only a role copied into a 30-day JWT.
3. Adopt `apiGuard` permission checks in every Track and Website API route; add role-aware page guards where pages currently use only `requireBusinessAdmin()`.
4. Build the minimum team lifecycle: invite/create, accept/activate, role change, deactivate/remove, and audit. Do not add custom permissions.
5. Implement a single active-business context. A multi-business selector is deferred until a real user needs it.
6. Add audit rows for role changes, invitation acceptance, removal, and privileged super-admin actions.

### Required authorization test matrix

| Actor | Must be allowed | Must be denied |
|---|---|---|
| Owner | Own business’s allowed modules/configuration | Any other business; platform controls |
| Manager | Assigned operational modules | Billing, team management, platform controls |
| Waiter | Own restaurant tables/orders | Settings, menu write, ticket/workflow, other tenant |
| Kitchen | Item/order progress only | Tables/customer details/settings/other tenant |
| Technician | Assigned/allowed tickets only | Workflow management unless granted; other tenant |
| Superadmin | Platform business management | Silent default access to customer/private operational data |
| Anonymous customer | Intended public resource through capability | Booking history, admin APIs, other customer records |

### Exit gate

- Direct API calls and direct page URLs match the permission matrix.
- Membership deactivation immediately prevents further protected access.
- Cross-tenant ID tampering returns 404/403 and does not leak resource existence.

## 6. Phase 3 — One entitlement and commercial model

**Goal:** make super-admin configuration truthful, explainable, and enforced.

**Migration axis:** commercial/entitlement only. Do not combine with membership or website migration.

### Work

1. Choose and implement the approved authority model:
   - product/module definitions are versioned platform configuration;
   - a business has active module grants;
   - an offer/subscription describes price, term, status, and relevant limits;
   - override fields are exceptional, displayed explicitly, and audited.
2. Define a single effective-access calculation and use it for page visibility, public CTA visibility, API guards, and mutation limits.
3. Replace the current Plans page with **Offers & Entitlements**. Do not permit arbitrary legacy feature editing.
4. Move Menu/QR visibility into explicit modules: Website, Menu, Order & Table QR, Booking, Track.
5. Treat `BRONZE`/`SILVER`/`STAR` as legacy migration data until safely migrated; do not expose them as the primary commercial vocabulary.
6. Make relevant limits enforceable at mutation time. A UI field is shown only if it is truly applied.

### Data migration strategy

- Add new records/columns; do not delete legacy fields in this phase.
- Build a deterministic mapping from existing plan/package/business type to new module grants.
- Run a dry-run report first: before/after effective access per business.
- Migrate one non-production fixture and verify public/admin access before production migration is considered.
- Keep a reversible legacy read fallback until all businesses are verified.

### Exit gate

- A superadmin can inspect one “effective access” explanation that matches runtime API behavior.
- Changing a module grant has a tested, immediate effect on navigation, public CTAs, and protected endpoints.
- No page shows editable feature/limit controls that are ignored by runtime access.

## 7. Phase 4 — Canonical website and connected public data

**Goal:** one public website model per business, driven by canonical operational data.

**Migration axis:** website data ownership only.

### Work

1. Adopt `Website` as the canonical editable model, subject to the approved decision in §2.
2. Inventory all existing `Site` rows and compare their content with the linked Business/Website data. Produce a conflict report; do not silently overwrite richer content.
3. Change `/s/[slug]` to render canonical Website/profile content and live projections:
   - Menu from MenuItem/Category;
   - Booking resources from active bookable resources;
   - Track lookup from real secure lookup;
   - generic offerings only from a future canonical offering model.
4. Retire `Site` precedence after data migration, retaining old rows for rollback/read-only historical use until explicitly approved for deletion.
5. Split the owner UI into:
   - Business profile/contact/hours;
   - website copy/theme/media/SEO;
   - module readiness and public preview.
6. Ensure preview and public route use the same renderer/data contract.

### Acceptance tests

- Editing phone/address/hours once updates the public site and relevant module pages.
- A menu update appears on the website without a copied item record.
- A Track business presents real code+phone lookup only when Track is enabled and workflow-ready.
- A public page never reads stale `Site` data in preference to owner-edited canonical data.

## 8. Phase 5 — Unified business console and truthful UI

**Goal:** make navigation match what the business owns and what the role may do.

### Work

1. Create the module-aware Business Console information architecture:
   - Dashboard, Website, Menu, Orders & Tables, Bookings, Tracking, Team, Notifications, Settings.
2. Preserve `/admin` and `/track-admin` as compatibility redirects during transition; do not break saved links.
3. Make dashboard widgets depend on enabled modules and staff role.
4. Consolidate Website editing into one screen. Separate operational notifications from outbound delivery history.
5. Redesign Superadmin navigation:
   - Overview;
   - Businesses (universal list with Website/Menu/Order/Booking/Track filters);
   - Offers & Entitlements;
   - Platform Settings;
   - Activity & Support Audit.
6. Convert “Track Clients” into a saved Businesses filter; add the equivalent Order/QR filter.
7. Replace the business creation wizard with Create Business → Configure modules/offer → Readiness checklist.

### UX acceptance criteria

- A restaurant owner sees no Track workflow controls unless Track is enabled.
- A service owner sees no table/kitchen language unless Order is enabled.
- A booking venue sees Booking setup and readiness, but no restaurant-only wording.
- A superadmin can identify every business’s enabled modules and effective limits from one screen.
- Every empty state states what is missing and offers only an authorized next action.

## 9. Phase 6 — Finish core operating workflows

**Goal:** make only the promised modules commercially usable.

### 6A. Restaurant Menu and Order

- Preserve server price calculation and tenant-scoped order flows.
- Introduce a server-issued table/session customer capability or deliberately document the shared-table ordering model.
- Add session-start/assistance abuse protection.
- Separate owner, waiter, and kitchen operational views by permission.
- Keep “bill” distinct from “payment” until a settlement model exists.

### 6B. Booking Venue (only after approved)

- Generalize booking ownership from `Restaurant` to `Business`; use additive columns/backfill/dual reads before removing legacy assumptions.
- Define generic resource terminology and types: court, lane, room, appointment/service, other.
- Add business timezone, cancellation/no-show/check-in rules, customer ownership proof, and privacy-safe status lookup.
- Make public website booking CTA appear only when an active resource exists.

### 6C. Service Tracking

- Preserve workflow stage history when an owner changes a workflow: version steps or disallow destructive replacement where tickets exist.
- Add ticket assignment/expected completion only after the service business workflow demands it.
- Keep public tracking secret-token based; retain code+phone fallback rate limits.
- Ensure notification delivery status is truthful and customer data is minimized.

### Exit gate

For each module, complete one business journey from setup to customer outcome to staff completion before expanding another vertical.

## 10. Phase 7 — Retention, reporting, and production operations

**Goal:** operate safely after core journeys are real.

### Work

- Replace implicit daily deletion rules with approved retention schedules by domain: operational records, customer data, financial/bill history, support records, audit logs.
- Add archive/purge processes with audit and clear recovery behavior; avoid hard delete as the default.
- Define report metrics and data sources before creating charts: orders/bills, booking utilization, ticket turnaround, module usage, platform subscription status.
- Implement authorized exports and data-deletion requests only after data ownership/retention is settled.
- Add structured logs, error correlation, monitoring/alerts, backup schedule, and restore drills.
- Replace in-memory public/login rate limits with deployment-appropriate shared storage if the app runs on more than one instance.

## 11. Per-phase verification checklist

Run from `qevyra/` after every implementation phase:

```text
npm run lint
npx tsc --noEmit
npm run build
node scripts/e2e-smoke.mjs      # when a dev server and test fixture are available
```

Additionally:

- Migration: `npx prisma migrate dev` locally; inspect generated SQL; production only uses `npx prisma migrate deploy` after approval.
- Authorization: exercise every matrix role through direct API requests and direct URLs.
- Tenancy: change route IDs/tokens to another tenant’s fixtures and prove denial.
- Public flow: run each affected menu/booking/track journey in a clean browser session.
- Regression: verify existing QR URLs, restaurant login, and legacy redirects still work.

## 12. Definition of done

The platform is ready for an initial commercial release only when all of the following are true:

- The business website is the single public source and projects live enabled-module data.
- Owners and staff have only their server-enforced permitted access in their active business.
- Superadmin controls correspond exactly to runtime behavior and are audited.
- Restaurant Order and Service Track can each complete their promised customer-to-staff workflow end to end.
- Booking is sold only after generic business-owned resources and private customer access are complete.
- No public page fabricates data or advertises payment/vertical support that does not exist.
- Retention, backups, restores, monitoring, and production migration procedures are verified.

## 13. Do not start yet

Do not start Hotel composite operations, Futsal/Swimming booking sales, online payments, advertising, marketplace, loyalty, AI, multi-location operations, or generic workflow automation until the earlier phase gates are passed.
