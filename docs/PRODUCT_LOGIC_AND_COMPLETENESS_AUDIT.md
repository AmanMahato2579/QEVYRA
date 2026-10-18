# QEVYRA Product Logic and Completeness Audit

**Audit date:** 2026-10-18  
**Scope:** the unified `qevyra/` Next.js application, its Prisma schema, routes, services, UI, and operational configuration. The live legacy product under `modules/order/menu-saas/` was not changed or treated as the development target.  
**Method:** source review, schema/migration review, route/guard tracing, and non-mutating checks. This is an architecture and code audit, not a penetration test or a live production-data review.

## 1. Executive summary

QEVYRA is a modular-monolith local-business platform that currently contains two real operating products:

- **Order:** a restaurant/hospitality QR menu, table-session, ordering, kitchen/service, bill, and resource-booking product.
- **Track:** a service-business ticket workflow with configurable stages and public tracking links.

It also contains an owner-editable `Website` model and a second, competing `Site` model intended to render public storefronts. The first is the operationally viable path; the second is seed/demo-oriented and can supersede the first publicly. This makes website data ownership ambiguous.

The strongest parts are tenant-scoped Order/Inventory services, server-derived order prices, transactional booking capacity checks, high-entropy Track public tokens, and a real central permission catalog for many Order APIs. The highest risks are not basic TypeScript quality; they are **control-plane truthfulness and incomplete RBAC adoption**:

1. Track and Website APIs authorize only an authenticated business context and plan feature, not the effective staff permission. A staff role can bypass hidden navigation by calling the routes directly.
2. `BusinessMembership` is a schema/catalog feature rather than a complete staff system. There is no team/invitation/membership administration, membership revocation is not checked on each request, and the session still resolves one direct `User.businessId`.
3. The super-admin Product editor persists feature/limit settings which runtime entitlement code does not read. The Restaurant `tableLimit` field is likewise not the table-creation limit. These are deceptive management controls.
4. Public booking-history endpoints disclose full booking rows to anyone who knows a public business/table identifier and a phone number, with no ownership proof or rate limit.
5. The public Site Track page is explicitly a fake demo that claims it found an active order. It must not be reachable in a commercially live storefront.

**Production conclusion:** do not market the current application as a configurable multi-role, multi-location platform. It is suitable for tightly controlled owner-operated pilots after the critical fixes below. Order can be the first production slice; Track can follow once RBAC and the public/website paths are corrected.

## 2. Existing system understanding

### What exists now

| Area | Observed implementation | Assessment |
|---|---|---|
| Platform | Next.js 16 App Router + Prisma/Postgres modular monolith | Sound baseline |
| Tenants | `Business` is the intended universal tenant; Order still uses `Restaurant` IDs on operational rows | Transitional, not complete |
| Identity | Credential login, bcrypt, JWT (30 days), token-version revocation | Usable; no recovery/invite lifecycle |
| Order | Table QR → session → server-priced order → order/item status → bill/close | Real end-to-end slice |
| Bookings | Bookable resource, slots, row lock/capacity check, owner transitions | Real but hospitality-specific and privacy-incomplete |
| Track | Workflow with ordered steps, tickets, status history, secret public token, lookup by code + phone | Real engine, incomplete authorization/auditing |
| Inventory | Tenant inventory item + append-only movement ledger | Real standalone ledger; not linked to recipes, sales, or tickets |
| Websites | Owner editable `Website`; public `Site` renderer with a `Site`-first fallback/bridge | Duplicate sources of truth |
| Notifications | In-app/push plus outbound provider adapters that record `NOT_CONFIGURED` honestly | Good foundation; retry/template policy absent |
| Plans/products | Legacy plan, BusinessProduct grant rows, overrides, and a code catalog | Too many overlapping authorities |

### Correct business model

The commercially coherent model is:

```text
Platform
  └─ Business (one legal/operator tenant)
       ├─ Locations (optional, later; operational entities must opt in deliberately)
       ├─ Members (one user may join one or more businesses)
       ├─ Entitlements (products/modules and limits)
       ├─ Public profile/site (a projection of canonical business data)
       └─ One enabled product family per initial business type
            ├─ Order: catalog, tables/resources, sessions, orders, bookings
            └─ Track: workflows, tickets, customer tracking
```

This does **not** require a generic marketplace, a microservice split, arbitrary per-field permissions, or a simultaneous multi-industry launch. The first release should choose supported operating models explicitly:

- Restaurant/café: Menu + Order; booking only when the business actually has reservable resources.
- Tailor/dry cleaner/repair/garage: Track; optional Website; ticket workflow is the operational core.
- Hotel/homestay and retail should not be considered fully supported merely because they appear in `BusinessType`: their rooms/stock/sales workflows are not yet modeled end-to-end.

## 3. Architecture assessment

| Classification | Evidence and consequence |
|---|---|
| Good | One Postgres database, Prisma constraints, append-only migrations, server-side money calculations, and transactional locks are appropriate for the current scale. |
| Good | `apiGuard`, `permissions.ts`, Zod parsing, tenant-scoped Inventory/Track service patterns, and high-entropy Track tokens are the correct direction. |
| Acceptable | Three-second refresh/polling is adequate for MVP operations; no websocket/event-bus work is justified now. |
| Risky | `src/lib/db.ts` is a large cross-domain Order module. Do not rewrite it; extract only when moving a tested slice. |
| Risky | Restaurant-transition and Business-transition identifiers coexist. Every new feature must choose `Business` unless it is intrinsically Order legacy data. |
| Wrong | `Website` and `Site` are both tenant-facing website stores. `getSiteBySlug()` prefers `Site`, while owners edit `Website`; values can silently diverge. |
| Wrong | Product configuration appears database-driven in the super-admin UI, but `getEffectiveAccess()` derives product features/limits from `plan-catalog.ts`, not the `Product` table fields edited by the UI. |
| Missing | A clear source-of-truth contract for commercial entitlements, staff membership lifecycle, locations, customer privacy, files, and business reporting. |

### Entitlement/control-plane defect

`BusinessProduct` membership rows are used to decide product IDs. However, `Product.featureKeys`, `Product.limitKeys`, and global `Product.isActive` are edited via `/api/super-admin/products/[productId]` while effective access uses the hard-coded `PRODUCT_CATALOG`. Therefore a successful Product editor save may change what the UI displays but not what the business can do. Similarly, `Restaurant.tableLimit` is changed in super-admin business management, but table creation enforces `effectiveTableLimit(access)` rather than that field.

Classify both as **C — broken management controls**. Before changing UI wording or adding features, select exactly one authority for each concern:

- Product definition/features/limits: database **or** versioned code catalog, not both.
- Customer entitlement: active `BusinessProduct` rows plus explicit overrides.
- Commercial price/term: subscription records, separate from module grants.
- Operational table limit: one canonical limit, tested at mutation time.

## 4. Account, role, and permission audit

### Current role model

`User.role` has three platform-login values: `SUPER_ADMIN`, `RESTAURANT_ADMIN`, and `TRACKING_ADMIN`. `BusinessMembership.role` additionally supports OWNER, MANAGER, FRONT_DESK, WAITER, KITCHEN, TECHNICIAN, INVENTORY, and ACCOUNTANT. The permission map is sensible, but the membership capability is not complete.

| Role | Purpose | Current access | Restricted / issue | Data scope |
|---|---|---|---|---|
| SUPER_ADMIN | QEVYRA operator | Businesses, plans, products, settings, activity; resets passwords and deletes tenants | No support-access protocol, approval boundary, or immutable actor audit | Platform-wide |
| RESTAURANT_ADMIN | Legacy Order owner login | Full Order permissions through the map; direct restaurant ID | Used as both login kind and owner authority; cannot represent a normal owner/member cleanly | One linked restaurant/business |
| TRACKING_ADMIN | Legacy Track owner login | Track business context and full business map | Same conflation; Track routes ignore the map | One linked business |
| OWNER | Intended tenant owner | Catalog says full business permissions | No invitation/team management or reliable runtime membership lifecycle | Intended one business |
| MANAGER | Intended delegated operator | Broad operational access, no billing/role/plan power | Some pages/routes do not enforce it consistently | Intended one business |
| FRONT_DESK | Booking/customer-facing staff | Bookings/tickets/orders in catalog | No assignment/location boundary | Intended one business |
| WAITER | Table/order staff | Order/resource actions in catalog | No table/shift assignment; dashboards can expose more than needed | Intended one restaurant/location |
| KITCHEN | Kitchen operations | Order view/manage in catalog | No separate kitchen board or item-only action boundary | Intended one restaurant/location |
| TECHNICIAN | Track operator | Ticket view/manage in catalog | Track routes do not distinguish it from workflow manager | Intended one business/location |
| INVENTORY / ACCOUNTANT | Specialist roles | Catalog grants narrow inventory or finance-read abilities | No staff management UI and no reporting/payment model for accountant | Intended one business |
| Customer | Anonymous public user | Menu, booking request, ticket link | Public booking history is insufficiently protected | Only their own resource/ticket |

### Actual authorization finding — HIGH

Order and Inventory APIs generally call `apiGuard({ permission: ... })` and scope by session-derived tenant IDs. By contrast, `/api/admin/track/**` and `/api/admin/website` use `loadBusinessContext()` plus an entitlement check only. `loadBusinessContext()` verifies a logged-in `RESTAURANT_ADMIN`/`TRACKING_ADMIN` context but not `tickets.*`, `workflows.*`, or `website.*` permissions.

Consequences:

- A technician or front-desk user who can authenticate for the business can call Track workflow creation/update/deletion routes even if the nav hides Workflows.
- A role without `website.manage` can call the Website PATCH route.
- Track pages use `requireBusinessAdmin()` rather than role-specific guards, so direct URLs can reveal operational data despite hidden navigation.

The app currently has UI-level role visibility and only **partial API-level RBAC**. This is a high-priority access-control fix, not a cosmetic navigation improvement.

### Membership lifecycle finding — HIGH

The schema has `BusinessMembership`, but no route/UI provides invite, accept, deactivate, remove, switch business, or change role. At login, a membership role is copied into a 30-day JWT; ordinary requests check token version but do not re-check membership `isActive` or membership role. The authenticated tenant is still `User.businessId`, rather than a selected active membership. A membership change therefore is not reliably immediate, and a truly multi-business staff user cannot choose a tenant safely.

**Decision:** keep the current fixed role catalog; do not build custom per-user permissions. Complete a small membership lifecycle first, with one active business context per request and server-side membership lookups/cached short-lived claims.

### Target permission matrix

This is the intended MVP matrix, not a claim of current enforcement. `FULL` means view/create/edit/transition/delete only where the module supports it; audit-protected destructive actions remain owner/platform-only.

| Module | Superadmin | Owner | Manager | Front desk | Waiter | Kitchen | Technician | Inventory | Customer |
|---|---|---|---|---|---|---|---|---|---|
| Platform businesses/plans | FULL | NONE | NONE | NONE | NONE | NONE | NONE | NONE | NONE |
| Business profile/team | FULL | FULL | READ | NONE | NONE | NONE | NONE | NONE | NONE |
| Website | FULL | FULL | EDIT | NONE | NONE | NONE | NONE | NONE | READ |
| Menu/catalog | FULL | FULL | FULL | READ | READ | READ | NONE | READ | READ |
| Tables/sessions | FULL | FULL | FULL | READ | FULL | READ | NONE | NONE | NONE |
| Orders/item progress | Support-read only | FULL | FULL | CREATE/EDIT | CREATE/EDIT | EDIT | NONE | NONE | Own only |
| Bookings/resources | Support-read only | FULL | FULL | FULL | READ | NONE | NONE | NONE | Own request only |
| Track workflows | Support-read only | FULL | READ | NONE | NONE | NONE | READ | NONE | NONE |
| Track tickets | Support-read only | FULL | FULL | FULL | NONE | NONE | EDIT | NONE | Own secret link only |
| Inventory | Support-read only | FULL | FULL | READ | NONE | NONE | NONE | FULL | NONE |
| Billing/plan | FULL | READ | NONE | NONE | NONE | NONE | NONE | NONE | NONE |
| Analytics | FULL (aggregate) | READ | READ | NONE | NONE | Operational queue only | Operational queue only | Stock only | NONE |
| Audit/support access | FULL, logged | Tenant audit read | NONE | NONE | NONE | NONE | NONE | NONE | NONE |

## 5. Super-admin specification

### Keep now

- Tenant creation, activation/suspension, safe lifecycle state changes, and controlled deletion.
- Product/entitlement assignment after the authority model is corrected.
- Subscription term/status administration; business access checks must be consistent at public and private entry points.
- Platform settings, templates/themes, activity, and aggregate platform health.
- Password-reset initiation only with an immutable actor/time/reason audit.

### Add before calling it production-ready

- Search/filter by business and lifecycle; a support case/reason field for privileged actions.
- Immutable audit actor ID, old/new payload (redacted), request/correlation ID, and result. `AdminActivity` currently has actor email and sparse action strings only.
- Separate suspension from deletion and require a deliberate deletion/retention policy. Current DELETE permanently cascades a business after manually deleting some order children.
- Entitlement preview/effective-access view that derives from the same source actually used by authorization.

### Do not grant by default

Super-admin should not silently impersonate a tenant, read all customer notes, or access individual customer tickets/orders without an explicit audited support action and purpose. Aggregate platform analytics are sufficient for normal operation.

## 6. Tenant isolation and public/private data audit

### What is sound

- Order menu/item queries and Order mutations scope by `restaurantId`; prices are derived server-side in `buildOrderItems()`.
- Track service methods take `businessId` and use tenant-scoped queries.
- Inventory service methods take `businessId`; movements have a tenant key.
- Public ticket rendering resolves a 192-bit `publicToken`, not the human sequential code. Lost-link lookup requires code + stored phone and is rate limited.
- `Customer` + `BusinessCustomer` is the right privacy shape, although core public Order/Booking flows do not yet use it.

### Findings

| Severity | Finding | Why it matters | Required response |
|---|---|---|---|
| HIGH | `GET /api/customer/bookings/public?slug=&phone=` and QR equivalent return `getCustomerBookings()` records after only a public slug/table token plus a phone value. They are not rate-limited and the returned Prisma booking shape includes customer/private fields. | Phone numbers are not secrets; this allows customer booking/history enumeration and PII exposure. | Remove history lookup until it has a booking secret, authenticated customer identity, or verified one-time code; minimize response fields and rate-limit. |
| HIGH | Staff membership is not revalidated per request and its active state is JWT-stale. | Removed users may retain capability; selected tenant is unclear. | Resolve active membership in guard/context on every protected request or use short claims plus revocation version. |
| HIGH | Track/Website role checks are omitted at the API boundary. | Hidden navigation can be bypassed. | Adopt `apiGuard` permissions and tenant context in every protected route. |
| MEDIUM | Customer Order POST accepts a session ID and caller-chosen customer token. | Anyone who learns an active session ID can create an order under any chosen token; it is mostly a table-context integrity issue, but should not be confused with customer identity. | Issue a server-generated per-session customer capability or explicitly document shared-table ordering as the model. |
| MEDIUM | Assistance requests require only active session ID; no customer capability is checked. | A leaked ID can spam staff (rate limit is per IP/session only). | Require the issued table/session capability. |
| MEDIUM | `TableSession` start endpoint has no rate limit. | A scanned QR can create notifications/sessions repeatedly. | Add token/IP throttling and an idempotent/occupation rule. |
| MEDIUM | Public Track service object contains customer name, although page rendering does not visibly use it. | Public DTO should contain only deliberately publishable fields. | Remove customer identity from public service DTO unless needed/displayed with consent. |

### Data classification

| Classification | Data |
|---|---|
| Public | Published business name, logo, address, hours, approved menu/services, public site copy, public ticket status through its secret link |
| Business-private | Tables, sessions, orders, bookings, inventory, workflows, tickets, notification events |
| Owner-only | Team, billing/plan, subscription, exports, configuration, audit, revenue reports |
| Platform-private | Products, global settings, all business account controls, platform audit/aggregates |
| Customer-private | Phone, name, booking note/history, ticket note/items/prices where not intentionally shared, customer/order history |

## 7. Database audit

### Correct entities

`Business`, `BusinessProduct`, `BusinessLocation`, `Customer`/`BusinessCustomer`, `BusinessMembership`, `Restaurant`, catalog/order/session models, booking/history models, Track workflow/ticket/history models, Inventory ledger, notification event log, and audit/activity models are all reasonable entities for the stated product.

### Problems and missing relationships

| Area | Finding |
|---|---|
| Tenant keys | New module tables use `businessId`, but Order rows retain `restaurantId`. This is acceptable transitional debt, not a reason to add more restaurant-only modules. |
| Locations | `BusinessLocation` exists but no table, booking resource, inventory item/movement, ticket, membership, or reporting record is location-scoped. Multi-location is not supported. |
| Staff | Membership has no invitation/acceptance metadata, created/disabled actor, per-location assignment, or authoritative selected business context. |
| Customers | Global and tenant-link entities exist but anonymous booking/order/ticket paths store their own contact fields and do not consistently link/create `BusinessCustomer`. Privacy model is therefore not operational yet. |
| Websites | `Business`, `Restaurant`, `Website`, and `Site` can each hold overlapping name/contact/address/logo/map/hours/menu-like content. |
| Billing/payment | Orders have monetary totals but no payment, settlement, refund, discount authorization, cash reconciliation, or invoice entity. The current “pay at counter” flow is valid only when described as an unpaid bill/close flow, not payment completion. |
| Workflow history | Updating a workflow deletes all steps. Existing tickets/history have references set null, so historical stage names/context can disappear or current tickets can lose their current-step relationship. |
| Retention | Daily reset deletes completed/cancelled tickets after 24 hours and any ticket older than seven days; completed/rejected orders after 24 hours; completed/rejected/cancelled bookings after 24 hours. That is unusually destructive for real businesses and conflicts with reporting/support/audit needs. |
| Customer access | Booking history has no booking secret/authorization entity. |

### Index/lifecycle notes

Most hot tenant/status/date indexes are present. Add indexes only after query evidence for new flows. More urgent than indexes: define retention by domain, preserve financial/operational history for a stated period, and cascade/delete only under a documented business deletion policy.

## 8. Feature inventory

States: **A complete**, **B partial**, **C broken**, **D fake/placeholder**, **E architecturally wrong**, **F duplicate**, **H missing**, **I future**.

| Feature | State | Business value/problem | Decision | Priority |
|---|---|---|---|---|
| Credential login + token version revoke | B | No reset/self-service/verification/invite; in-memory throttle is per instance | FIX lifecycle/rate limiting | P1 |
| Platform business administration | B | Useful, but destructive delete/audit/control-plane mismatch | FIX | P1 |
| Product editor | C | Saved feature/limit edits do not drive runtime | FIX before use | P0 |
| Plan editor | B | Works for legacy-plan fallback; overridden by product-row path | SIMPLIFY/clarify | P1 |
| Membership/staff roles | B | Schema/catalog exists, not operable or consistently enforced | FIX | P0 |
| Restaurant menu/catalog | A | Tenant-scoped CRUD, availability, server pricing | KEEP | P1 |
| Table QR/session/order | B | Real core flow; public capability/abuse edges remain | FIX then KEEP | P0 |
| Kitchen/item lifecycle | B | Per-item transitions/partial serve work; no dedicated restricted kitchen workflow | KEEP/SIMPLIFY UI | P1 |
| Bill/session close | B | Calculates bill; no payment/settlement record | KEEP as bill, do not call payment | P1 |
| Booking resources | B | Capacity-safe request/status flow; public history leak and no cancellation by customer | FIX | P0 |
| Public booking history | C | PII leak | REMOVE pending secure redesign | P0 |
| Track workflows/tickets | B | Real configurable ordered workflow; no permission enforcement and destructive step edits | FIX | P0 |
| Track public URL/lookup | A | Secret link + rate-limited fallback is sound | KEEP | P1 |
| Ticket expected completion | H | Required by stated customer workflow | ADD after scheduling decision | P2 |
| Ticket line item prices | B | Displays optional price, but no tax/total/payment semantics | KEEP clearly non-invoicing | P2 |
| Inventory ledger | B | Good append-only stock movement; no consumption integration/location scope | KEEP standalone | P2 |
| Outbound notifications | B | Honest not-configured state, no job/retry/template policy | KEEP, add delivery architecture later | P2 |
| Website editor (`Website`) | B | Real editor, but duplicate public source and missing role guard | FIX source of truth | P0 |
| Site engine (`Site`) | E/F | Stores duplicate business/catalog data; has no owner editor | DEFER/remove from tenant path or migrate deliberately | P1 |
| Site Track Demo | D | Fabricates a found order/status | REMOVE from live routes | P0 |
| Site ads | I | No proven traffic/moderation/commercial workflow | DEFER | Future |
| Push/PWA | B | Operational enhancement, not core; failure/consent lifecycle is limited | DEFER hardening | P3 |
| Analytics/reporting | H | Only counts/operational lists, not business metrics | ADD after retention/payment semantics | P2 |
| Multi-location | B | Entity only | DEFER until a real multi-site customer requires it | Future |

## 9. Business workflow audit

| Workflow | Current flow | Correct flow / missing pieces |
|---|---|---|
| Onboarding | Super-admin creates business/owner directly | Create → profile basics → choose supported product → configure canonical data → invite staff → publish/activate. No owner self-onboarding, checklist, or invitation exists. |
| Staff | Role catalog/membership table only | Owner invites user, user accepts, membership becomes active, role/location applies immediately, owner may revoke, all changes audited. |
| Menu + Order | QR → table session → cart → server-priced order → accept → item prepare/serve → bill → close | Strong core. Define session/customer capability; add closing/settlement semantics and do not promise online payment. |
| Booking | Public page → slots → request → staff accepts/rejects/completes | Enforce customer ownership for viewing/cancelling; define check-in/no-show/cancellation policy and business timezone. |
| Track ticket | Staff creates ticket → workflow steps advance → ready → complete → customer link | Configurable steps are real. Preserve historical definitions, enforce role permission, optionally record due date/estimated completion and assigned technician. |
| Website | Owner edits `Website` → `/s/slug` bridge only when no `Site` row | One canonical profile/site projection. Current Site-first precedence creates inconsistency. |
| QR | Table QR is a random stable token and Track QR embeds secret public token | Keep opaque stable capability URLs. There is no generic business/resource QR registry, rotation history, redirect/admin analytics, or non-table resource QR model. |
| Notifications | Domain action → in-app or outbound event | Document recipients/templates/retry/consent and distinguish delivery attempt from delivery receipt. |
| Payments | Bill tells customer to pay at counter | Correct MVP terminology: *bill generated; payment is external*. Add payment only when a reconciliation/refund model is designed. |
| Reporting | Dashboard counts and short operational histories | Needs retained source data, metric definitions, authorization, export/retention policy before it can be a business report. |

### Workflow engine determination

Track is genuinely configurable in the narrow, useful MVP sense: each workflow owns ordered `WorkflowStep` records, and advance logic chooses the next step dynamically. It is not a generic BPM/workflow engine—and should not become one. Its present defect is that updating a workflow replaces/deletes steps, damaging historic semantic context.

## 10. Frontend ↔ backend consistency matrix

| Feature | UI | API/service | DB | Auth/tenant | Validation | Business logic | Status |
|---|---|---|---|---|---|---|---|
| Login | Yes | Yes | User | Partial throttle/revoke | Zod | Yes | Partial |
| Staff/team | Nav permission concept only | No management API | Membership | Partial/stale | N/A | No lifecycle | Incomplete |
| Menu | Yes | Yes | Yes | Yes | Most routes | Yes | Complete core |
| Tables/QR | Yes | Yes | Yes | Yes for admin | Yes | Limit race/capability gaps | Partial |
| Customer order | Yes | Yes | Yes | Public revalidation | Yes | Server money/idempotency | Partial |
| Order kitchen/service | Yes | Yes | Yes/history | Yes | Yes | Per-item lifecycle | Partial |
| Bill | Yes | Yes | Yes | Yes | N/A | Total calculation | Partial, no payment |
| Bookings | Yes | Yes | Yes/history | Staff yes, customer weak | Yes | Capacity transaction | Partial/security defect |
| Track workflows | Yes | Yes | Yes | Tenant yes; permission no | Yes | Configurable steps | Partial/security defect |
| Track tickets | Yes | Yes | Yes/history | Tenant yes; permission no | Yes | Secret public link | Partial/security defect |
| Inventory | Yes | Yes | Yes/ledger | Permission + tenant | Yes | Atomic movements | Partial, standalone |
| Website (`Website`) | Yes | Yes | Yes | Tenant yes; permission no | Mostly | Editor works | Partial |
| Public `Site` | Yes | Read service | Yes | Published/active | Sanitizes Site fields | Duplicate/fake track page | Architecturally wrong |
| Products/plans | Yes | Yes | Yes | Super-admin | Yes | Runtime mismatch | Broken |
| Notifications | Yes | Yes | Yes | Mostly | Mixed | Honest provider state | Partial |
| Analytics | Basic counts | Server query | Yes | Super-admin/owner pages | N/A | No defined metrics | Missing |

## 11. Security audit

### Critical / release blockers

1. **Broken staff authorization in Track and Website APIs.** Implement permission guard adoption before any staff account is used.
2. **Public booking-history disclosure.** Remove or redesign endpoint before public deployment.
3. **Super-admin product controls do not correspond to runtime entitlements.** Do not use them for commercial access decisions until unified.

### High

1. Membership removal/role changes are not enforced against a live JWT and there is no membership lifecycle.
2. Site Track Demo fabricates a customer result in a public route.
3. Workflow editing deletes steps referenced by active/historical tickets.
4. Tenant deletion is an irreversible cascade with limited audit/retention safeguards.
5. Data retention deletes tickets and historical booking/order data too aggressively for a platform that plans reports/support.

### Medium

1. Customer order/assist endpoints rely on session IDs and caller/client tokens rather than an issued session capability.
2. Public session creation lacks abuse throttling.
3. In-memory login/public rate limits do not work across multiple server instances and can be cleared under bucket pressure.
4. No CSP or explicit HSTS policy in app headers (hosting may supply HSTS); user-provided URL/image handling must stay sanitized.
5. Audit logging is sparse and does not capture actor ID, before/after values, or staff operational mutations.
6. No documented backup restore test, monitoring/alerting, SLO, error correlation, dependency vulnerability review, or export/deletion request process.

### Low

1. Lint has 28 warnings, mostly unused values, React Hook Form compiler skips, and raw image performance hints; no lint errors.
2. Health endpoint reveals only service/DB state, appropriate for a controlled probe but should be constrained by deployment routing if exposure is undesirable.

## 12. Production readiness audit

| Concern | Status | Priority |
|---|---|---|
| SQL injection | Prisma/parameterized raw queries used appropriately in reviewed paths | Low risk |
| Authentication | Credentials + bcrypt + JWT revocation is present; recovery/verification/invite absent | High |
| Authorization | Partial; Track/Website and pages bypass staff permission model | Critical |
| Tenant isolation | Good in core services; transitional user/membership context and public booking leak need correction | Critical |
| Validation | Strong on many mutations; inconsistent older routes | High |
| Rate limiting | Present on some public endpoints but in-memory/partial | High for public abuse |
| CSRF | SameSite Lax cookie helps; no formal origin/CSRF policy for authenticated mutations | Medium |
| Secrets | `.env.example` is appropriate; production secret verification/warnings need deployment enforcement | Medium |
| Migrations | Append-only history/Prisma setup is appropriate | Low |
| Backup/restore | Scripts exist, but no evidence of scheduled tested restores | High operational risk |
| Monitoring/logging | Console logging and health endpoint only | High |
| Files/storage | URLs only; no upload lifecycle/ownership/content policy | Medium |
| Data retention | Implemented but commercially unsafe/undefined | High |
| Payment correctness | No payment system; correctly defer rather than imply it exists | Medium |
| Accessibility/loading/error | Global/error/loading components exist, but not independently verified across every client mutation | Medium |

## 13. Over-complexity audit

| Item | Decision | Reason |
|---|---|---|
| Modular monolith | KEEP | Correct scale and deployment shape. |
| Generic workflow engine | SIMPLIFY | Ordered Track steps are enough; do not add branching/event automation now. |
| `Business` + `Restaurant` transition | SIMPLIFY incrementally | Necessary migration bridge, but prohibit more split ownership. |
| Plan + Product + override + legacy table limit | SIMPLIFY urgently | Four entitlement representations cause false controls and incorrect mental models. |
| Separate `Site` content database | REMOVE from live tenant path or migrate once | It duplicates canonical business/website/menu data without owner workflow. |
| Site ads/local discovery | DEFER | No traffic, moderation, targeting, billing, or advertiser workflow. |
| Multi-location | DEFER | Entity only; no consumer is location-aware. |
| Push/SMS/WhatsApp retries | DEFER a queue until operational volume requires it | Current honest failure state is better than fabricated delivery. |
| Online payments/accounting/loyalty | DEFER | Requires legal, financial, refund, reconciliation, and customer identity decisions. |
| WebSockets/event bus/microservices | DO NOT BUILD YET | Polling and modular monolith are sufficient. |

## 14. Missing features by need

### MVP-critical

- Real membership invitation, acceptance, revoke, role change, selected-business context, and server enforcement.
- Secure public booking ownership/access and cancellation policy.
- One entitlement authority and a truthful super-admin UI.
- One public-site source of truth; removal of fake tracking UI.
- Audited lifecycle states for business suspension/deletion and sane retention.

### Important

- Password reset/recovery, email/phone verification appropriate to the market, owner transfer, and staff removal audit.
- Business setup checklist and clearly supported business-type templates.
- Track due/expected completion, assignment, and non-destructive workflow-version behavior.
- Operational audit trail for status/role/configuration changes.
- Reporting definitions, retained source data, exports, and privacy controls.
- Provider retry/failure policy and customer notification preferences/consent.

### Later

- Location-scoped records, staff, inventory, bookings, and reporting.
- Customer identity/account and consented cross-device history.
- File/media upload/storage service.
- Payment/cash reconciliation and refunds if the business model requires them.

### Future

- Marketplace, advertising, sophisticated discovery, AI assistant, recommendations, generalized automation, accounting, loyalty, and microservices.

## 15. Terminology standard

Use these terms consistently:

| Concept | Standard term | Avoid |
|---|---|---|
| Tenant | Business | Restaurant when referring to all verticals; organization interchangeably |
| Human business account | Member | User when authorization context matters; staff only for employee-facing copy |
| Privileged tenant member | Owner | Restaurant admin/tracking admin in product copy |
| Track work unit | Ticket | Order/job interchangeably in Track UI |
| QR Menu purchase intent | Order | Sale/payment until settlement exists |
| Reservable capability | Resource | Service when it means time/capacity unit |
| Booking record | Booking request / booking | Reservation unless hospitality wording requires it |
| Public profile | Business website | Site vs website as separate product concepts |
| Customer | Customer | Client unless a vertical needs client-facing copy |

## 16. MVP definition

The MVP is not every business type. It is:

1. **Order MVP:** owner-managed restaurant with menu, stable table QR, scoped staff roles, table order workflow, bill, and optional resource booking.
2. **Track MVP:** owner-managed service business with role-scoped ticket entry/advancement, ordered workflow, secret customer tracking link, and truthful notifications.
3. **Website MVP:** one published projection per business drawing shared profile/contact/hours and enabled product data from canonical sources.

No payments, marketplace, ads, generic CRM, multi-location operations, or customer account history is required for this MVP.

## 17. Implementation dependency graph

```text
Canonical business + entitlement authority
            ↓
Active tenant membership + server-side RBAC
            ↓
Public/private data contracts + retention policy
            ↓
Order and Track workflow hardening
            ↓
Canonical website/QR projection + notifications
            ↓
Reporting and controlled exports
            ↓
Optional locations, payments, integrations
```

## 18. Complexity estimates

| Work | Complexity | Dependencies |
|---|---:|---|
| Correct Track/Website API/page permission enforcement | S | Permission map/tenant context |
| Remove/redesign booking-history exposure | S | Customer-access decision |
| Disable fake Site Track Demo | XS | None |
| Unify Product/Plan/Table limit authority | M | Product-owner commercial decision |
| Membership lifecycle + tenant selection/revocation | L | Authentication, data migration, UX |
| Canonical Website/Site migration decision and implementation | M–L | Content/data ownership decision |
| Workflow versioning/non-destructive editing | M | Track historical semantics |
| Retention/deletion/audit policy | M | Legal/commercial input |
| Order public session capability | M | Customer/table UX decision |
| Basic business reporting | M | Retention and payment/metric definitions |
| Multi-location operations | XL | Proven customer demand and all core models |
| Payments/reconciliation | XL | Provider/legal/refund/accounting design |

## 19. Phase-by-phase roadmap

### Phase 0 — Stop false or unsafe behavior

- Disable/remove the public Site Track Demo route/section from published business sites.
- Remove public booking-history endpoints or return no data until ownership is proven.
- Adopt permission guards in every Track and Website route and page; test each staff role against direct URLs/APIs.
- Freeze Product/Plan editor changes until runtime authority is made truthful.

### Phase 1 — Make tenant access real

- Choose user-to-business membership as the authority; implement invite, accept, deactivate, remove, role change, and current business selection.
- Derive effective role and tenant from an active membership on protected requests.
- Add audit records for membership and super-admin privilege changes.

### Phase 2 — Normalize commercial controls and business lifecycle

- Make products, plans, overrides, and limits a single documented evaluation pipeline.
- Define Created/Onboarding/Active/Suspended/Cancelled/Archived behavior and public/private effects.
- Replace destructive default business deletion with archived state plus a controlled purge policy.

### Phase 3 — Finish core product slices

- Order: session capability, table/session abuse handling, settlement terminology, role-specific workspaces.
- Booking: customer secure link/OTP, cancellation/no-show/check-in policy, resource semantics.
- Track: non-destructive workflow changes, assignment/due estimate where needed, staff permissions.

### Phase 4 — Canonical public presentation and QR

- Select `Website` or a migrated `Site` model, not both.
- Project business profile/contact/hours/catalog from canonical data.
- Define QR inventory/rotation/analytics only for real QR use cases: table, ticket, and optional business landing page.

### Phase 5 — Operability

- Retention/export/deletion policy, structured audit logs, monitoring/error correlation, backup restore drills.
- Minimal tenant reports only after metrics and retained data are trustworthy.
- Notification queue/retry only when connected providers and operational demand justify it.

## 20. Must fix before production

1. Enforce staff permissions on Track/Website pages and APIs, not just navigation.
2. Remove or secure public booking-history lookup and minimize public booking responses.
3. Make membership activation/revocation and tenant selection authoritative at request time.
4. Unify entitlement evaluation; do not expose super-admin controls that do not alter runtime behavior.
5. Remove the fake Track Demo from any published customer route.
6. Preserve workflow history and define data retention before deleting operational records after 24 hours/seven days.
7. Add structured audits for privileged, staff, deletion, role, and data-access actions.
8. Establish backups, restore testing, monitoring, and production rate-limit backing.

## 21. Do not build yet

- Marketplace/local advertising (`SiteAd` commercial expansion)
- Generic CRM or cross-business customer profile
- Online payment/refund/accounting
- Loyalty/rewards
- AI operations assistant or recommendations
- Websocket/event-bus/microservices
- Full multi-location rollout
- General-purpose workflow automation
- Advanced business intelligence

## 22. Open product-owner decisions

1. Which initial verticals are commercially supported at launch: restaurant only, or restaurant plus service tracking? Hotels, homestays, retail, and cleaning should not be implied without complete workflows.
2. Is a business allowed to enable both Order and Track products, or should a business type choose one product family initially?
3. What is the legal/operational retention policy for orders, bookings, tickets, customer data, and audit logs? The current 24-hour/7-day deletion rules should not be accepted by default.
4. Is public customer history a product requirement? If yes, choose a customer account, signed per-record link, or phone OTP—not a raw phone lookup.
5. Is payment intentionally out of scope for the next release? If yes, standardize UI copy on “bill/settlement at counter.”
6. Which source becomes the canonical public website model, and how will existing data be migrated/decommissioned?
7. Are products and plans commercial offers, technical feature bundles, or both? Decide their single authority before changing pricing/features in production.
8. Does the business need staff to work across several businesses or locations now? If not, constrain the first membership implementation to one business per user to avoid an incomplete selector.

## 23. Verification performed

- `npx.cmd tsc --noEmit` completed successfully on 2026-10-18.
- `npm.cmd run lint` completed with **0 errors and 28 warnings** on 2026-10-18. Warnings are mostly unused values, React Hook Form compiler compatibility notices, and raw `<img>` performance hints; they do not invalidate the substantive findings above.
- No application source, database schema, migrations, configuration, or dependency files were modified during this analysis. This document is the sole deliverable.

## 24. Primary evidence reviewed

- `qevyra/prisma/schema.prisma`
- `qevyra/src/lib/auth.ts`, `auth-guard.ts`, `api-guard.ts`, `permissions.ts`, `plans.ts`, `db.ts`, `daily-reset.ts`
- `qevyra/src/modules/track/services.ts`, `modules/inventory/services.ts`, `modules/sites/services.ts`, `modules/sites/sections/track-demo.tsx`, `modules/website/services.ts`
- Protected/public API routes under `qevyra/src/app/api/`
- Public/admin route pages and `qevyra/vercel.json`, `next.config.ts`, `.env.example`
- Existing architecture, database, plan, and build-plan documentation.
