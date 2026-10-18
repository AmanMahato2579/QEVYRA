# QEVYRA Product UI and Platform Model Plan

**Status:** proposed product direction; no application changes are authorized by this document.  
**Date:** 2026-10-18  
**Inputs:** current page/source audit and product-owner direction: digitalize local businesses through a public website, with optional SaaS operating modules for tracking, bookings, menu/ordering, and future verticals.

## 1. The product in one sentence

**QEVYRA gives every business a professional website, then connects that website to the operational tools that business actually uses.**

The website is the public front door. SaaS modules are the private operating tools behind it. They must be connected—not separately configured copies of the same business.

```text
Business profile and public website
              │
              ├─ Website only: information, contact, offerings
              ├─ Booking: services/resources, availability, booking requests
              ├─ Menu: live menu/catalog
              ├─ Order: table QR, ordering, kitchen/service, bill
              └─ Track: tickets, progress, secure customer tracking
```

This is different from selling disconnected “Website”, “Order”, and “Track” apps. A customer should never have to wonder whether the menu, booking form, tracking screen, or contact details belong to a different product.

## 2. Product-model decisions

### 2.1 The website is universal; modules are optional

Every business starts with a website and canonical business profile. A module is enabled only when the business needs an operational workflow:

| Business use case | Public website shows | Private SaaS module(s) | Current reality |
|---|---|---|---|
| General business / shop | Profile, contact, hours, map, gallery and offerings | Website only | Partly possible; generic offerings need a canonical model |
| Restaurant/café | Profile, live menu, directions; table QR directs to contextual menu | Menu; optional Order; optional booking | Strongest current slice |
| Tailor/dry cleaner/garage/repair | Profile, services, real ticket lookup | Track | Real but needs RBAC/workflow hardening |
| Futsal/swimming/venue | Profile, bookable resources/services, real availability and booking CTA | Booking | **Not currently a supported vertical:** booking is tied to `Restaurant` |
| Hotel/homestay with restaurant | Profile, rooms/resources, restaurant menu, booking, table ordering where relevant | Booking + Menu + optional Order | **Not currently complete:** do not sell as ready yet |
| Retail/catalog business | Profile and product/offering display | Website now; catalog/commerce later if justified | Not a full current product |

### 2.2 Business type is a template, not a module lock

The current code sends a business into either the Menu/Order family or the Track family based on `BusinessType`. That cannot represent the intended model:

- A hotel can need Booking + Menu + Order.
- A futsal venue needs Booking without Menu/Order.
- A general business needs Website without a fake item list.
- A repair shop may later need Booking + Track.

**Target rule:**

```text
Business type → recommended terminology, website layout, onboarding checklist
Enabled modules → actual screens, permissions, APIs, and public CTAs
```

Business type must never be the only technical authorization switch. It is a product template. Entitlements/modules determine real functionality.

### 2.3 One owner console, not separate products in the owner’s mind

The current `admin` and `track-admin` shells make a business feel as though it owns only one part of QEVYRA. Long term, retain legacy paths only as redirects and provide one business console:

```text
Business Console
  Dashboard
  Website
  [Menu]
  [Orders & Tables]
  [Bookings]
  [Tracking]
  [Inventory — only when genuinely enabled]
  Team
  Settings
```

Brackets indicate module-gated navigation. The owner sees only enabled, useful modules. Staff sees only actions allowed by role.

## 3. Public website: the authoritative digital front door

### What is public and shared

The following must come from one canonical business profile, never copies in `Business`, `Restaurant`, `Website`, and `Site`:

- Business name, logo, phone/WhatsApp, address/map, opening hours, brand colour, language.
- Website theme, story, images, SEO copy, social links, and publishing state.
- Module-driven public sections, which are read-only projections of SaaS data.

### Automatic module sections

| Enabled module | Website behaviour | Do not do |
|---|---|---|
| None / Website only | Present profile, contact and manually managed business offerings | Invent a menu, booking button, or tracking result |
| Menu | Render live categories/items/availability from the menu SaaS | Maintain a second copied website menu (`SiteItem`) |
| Order | Explain “scan the table QR to order” and deep-link from a valid table context only | Offer an unauthenticated universal checkout when Order is table-based |
| Booking | Render actual bookable services/resources and availability; submit a request | Show booking CTA when no active resource exists |
| Track | Render the real lookup UI: tracking code + phone, then use the secure token flow | Display the current Site “Demo Mode / Found active demo order” component |
| Future catalogue | Render live public offers from one future canonical offering model | Reuse static site items as a hidden second catalog |

### Required public information architecture

1. Header: logo, business name, compact navigation.
2. Hero: what the business does and one contextual primary CTA.
3. Relevant live module section(s), in an intentional order.
4. About/services/offerings only where supplied.
5. Contact, hours, map, social links, review link.
6. Privacy-safe footer.

The CTA must be derived by enabled module and data readiness, for example:

- Restaurant with Order: **View menu** → public menu; **Order at your table** → instruction/QR only.
- Futsal with Booking: **Book a court**.
- Tailor with Track: **Track my order**.
- Website-only business: **Call**, **WhatsApp**, **Get directions**, or **View services**.

## 4. What is wrong in the current UI

### 4.1 Company home page (`/`)

| Current element | Problem | Correct direction |
|---|---|---|
| “Everything your business needs in one place” | Too vague and over-promises to every vertical. | Lead with a connected business website and say which workflows are supported. |
| Product cards: Website, Order, Track | Booking—the intended futsal/swimming/hotel use case—is absent. Website is presented as a peer app rather than the common public layer. | Show “Your Website” first, then operating solutions: Restaurant, Bookings, Service Tracking. |
| “See it live” hard-coded demos | Demos may not exist in a deployment; `/track?business=...` is not the real tracking flow. | Use verified seeded demos only in non-production, or remove this section until there are intentionally public examples. |
| “Customers order and pay via QR” package claim | Payment is not implemented. | Say “view menu and place table orders; settle at the counter” until payment/reconciliation exists. |
| “Today's history, reset each night” package claim | It advertises destructive retention as a product benefit. | Remove; define trustworthy retention first. |
| Four package prices, legacy plans, and Products | Three competing commercial vocabularies confuse prospects and operators. | Use one simple offer model, described in §6. |
| Primary CTA = Login | A prospect who has no account reaches an unsuitable route. | Primary CTA should be “Talk to us / Request setup”; login is secondary. |

### 4.2 Super-admin navigation

The current navigation is **Overview / Businesses / Track Clients / Plans / Settings / Activity**.

This is confusing because **Businesses** already includes Track tenants, while Menu/QR tenants have no equivalent navigation item. It makes Track feel like a special product and makes Menu/QR invisible as a platform concept.

**Target navigation:**

```text
Overview
Businesses                    ← one complete tenant list
  filters: Website | Menu | Order/QR | Booking | Track | active/suspended
Offers & Entitlements         ← commercial setup; not raw legacy plans
Platform Settings
Activity & Support Audit
```

There should be no separate “Track Clients” page as a primary destination. If useful operationally, it becomes a saved filter of Businesses (`module: Track`) or an Overview drill-down. Menu/QR is then equally visible with its own filter (`module: Order/QR`).

### 4.3 Super-admin business creation

The current form combines owner credentials, business type, table count, products, “product package,” legacy billing plan, duration, publish website, and Star founder number. It is too much for one operation and contains fields whose runtime effects are currently inconsistent.

**Correct two-step flow:**

1. **Create business:** name, owner, business type/template, phone/location, initial status.
2. **Configure modules and commercial access:** Website is on; choose Menu, Order, Booking, Track; then set only the limits/term that the selected offer actually supports.

The UI must explain implications before saving:

```text
Booking ON → configure at least one resource/service before website CTA appears.
Order ON → create menu and tables before customers can order.
Track ON → create a workflow before public tracking CTA appears.
```

### 4.4 Plans/products UI

The current “Products & Plans” page presents Product access plus “Legacy billing tiers,” with editable Product feature/limit fields, editable plan features, hard-coded catalog defaults, per-business overrides, and packages elsewhere. This is not an understandable commercial UI—and it currently does not truthfully govern runtime access.

**Do not create arbitrary plans in the UI.** There are two separate concepts:

| Concept | Owner-facing wording | Authority |
|---|---|---|
| Product/module | Website, Menu, Table Ordering, Booking, Tracking | Platform-defined capability; versioned in code/data once, not both |
| Offer/subscription | A commercial bundle, price, term, limits, status | Platform commercial record and per-business grant |

For MVP, use a structured **Offer** form rather than free-form plans:

```text
Offer name
Included modules
Limits that matter (for example QR tables, workflows)
Term / renewal / status
Price notes (until billing is integrated)
```

The business detail shows a read-only effective access summary and a deliberate “Change offer/modules” action. It must never show legacy BRONZE/SILVER/STAR configuration as if it is the governing product policy.

### 4.5 Business admin shells

| Current page/group | Mistake or ambiguity | Target UX |
|---|---|---|
| Restaurant Admin sidebar | Calls itself generic “Business Admin” but is restaurant-specific: Tables, Take Order, Menu. | Label the product context clearly or use module-aware navigation. |
| Track Admin shell | Separate purple application, separate dashboard, separate website editor. | Present as the same Business Console with Tracking selected; website should be one screen. |
| Website screen | Owner edits `Website`, but public route can prefer unrelated `Site`; preview is not proof of public result. | One editor → one public model → preview exactly that result. |
| Dashboard | Restaurant dashboard mixes revenue, sessions, tables, kitchen; good for restaurant only. | Dashboard widgets must be module- and role-specific, not type-agnostic. |
| Inventory | Visible/implemented as a standalone ledger with no recipe/menu/ticket connection. | Hide unless explicitly enabled; do not make it a default promise. |
| Notifications | Combines operational inbox and outbound provider log. | Separate “Operational notifications” from “Customer message delivery” in labels and permissions. |

### 4.6 Current page-by-page UX disposition

| Page or page group | Does it make business sense now? | Direction |
|---|---|---|
| `/` company home | Partly; message and offers are misleading | Rebuild messaging/CTA only after offer decision |
| `/login`, `/inactive`, terms/privacy/contact | Necessary supporting surfaces | Keep; add password recovery/clear support path later |
| `/s/[slug]` public site | Right destination, wrong competing data model | Keep route; unify data model and remove demo behavior |
| `/s/[slug]/menu` | Makes sense when Menu is on | Derive live menu only |
| `/s/[slug]/track` | Does **not** make sense today; fake result | Replace with real Track lookup or remove |
| `/r/[slug]` public menu | Makes sense as a menu view | Clarify it is browse-only; table QR is the ordering entry point |
| `/r/[slug]/t/[token]/*` | Makes sense for restaurant table order/bill/book flows | Harden capability/security and use only where relevant |
| `/admin` restaurant dashboard | Makes sense for restaurant owner/operator | Rename/reframe as module-aware dashboard |
| `/admin/menu`, categories, item edit | Makes sense | Keep; streamline under one Menu area |
| `/admin/tables`, service, orders | Makes sense for table-service restaurant | Keep; distinguish waiter/kitchen/owner workspaces by role |
| `/admin/bookings`, booking services | Makes sense for restaurant/hospitality resources | Generalize before claiming futsal/swimming support |
| `/admin/inventory` | Useful future module, incomplete business connection | Hide/defer by default |
| `/admin/website` | Essential but currently disconnected from Site precedence | Make canonical |
| `/track-admin` dashboard/tickets/workflows | Makes sense for service businesses | Merge visual shell and enforce staff permissions |
| `/super-admin/businesses` | Correct foundation | Make the one tenant management source |
| `/super-admin/tracking` | Redundant top-level tenant subset | Convert to a saved business filter/drill-down |
| `/super-admin/plans` | Does not make sense as currently modeled | Replace after entitlement authority decision |
| `/super-admin/restaurants` | Old redirect | Keep only as compatibility redirect until links are migrated |

## 5. Required UI information architecture

### 5.1 Business owner console

```text
Business Console
├─ Dashboard                         role + enabled modules decide widgets
├─ Website                            always present
│   ├─ Profile & contact              canonical business data
│   ├─ Website content/theme          presentation data
│   └─ Preview / publish              real public projection
├─ Operations                         only enabled modules
│   ├─ Menu
│   ├─ Orders & Tables
│   ├─ Bookings
│   └─ Tracking
├─ Team                               when membership lifecycle exists
├─ Notifications                      operational inbox/delivery history, separated
└─ Settings                           business configuration, not commercial entitlement
```

Examples of dashboard widgets:

| Business/module | Owner sees | Operational staff sees |
|---|---|---|
| Website only | Profile completeness, public-site state, contact clicks later | No dashboard required |
| Restaurant + Order | Pending orders, active tables, kitchen queue, today’s bill total | Waiter: assigned/open tables; Kitchen: prep queue |
| Booking venue | Today’s booking requests, upcoming resources, occupancy | Reception: today’s schedule/check-ins |
| Track business | Open/ready tickets, due/overdue count, recent activity | Technician: own/current tickets only |
| Hotel composite | Booking occupancy, restaurant orders, guest service tasks | Strictly role/location-scoped views |

### 5.2 Super-admin business detail

The generic business page should be the real control centre for one tenant:

```text
Business detail
├─ Summary: status, owner, type/template, public URL
├─ Modules: Website / Menu / Order / Booking / Track, readiness checks
├─ Subscription: offer, term, effective limits, changes
├─ Team: owner + members (after lifecycle exists)
├─ Public site: published state and safe preview
├─ Operations: aggregate counts only, module-specific drill-down if support access is approved
└─ Audit: platform actions and support reason
```

“Menu QR” belongs in **Modules** as **Order & Table QR**, and in the Businesses list as an **Order/QR filter/badge**. It should not be hidden just because there is no `Menu Clients` nav item.

## 6. Commercial model that people can understand

### MVP offers—not generic plans

Until automated billing exists, do not expose editable global plan engines. Let platform staff attach a simple offer to a business:

| Offer example | Modules | Business promise |
|---|---|---|
| Digital Presence | Website | A maintained public business website |
| Restaurant Menu | Website + Menu | Website with live menu, updated by restaurant staff |
| Restaurant Operations | Website + Menu + Order | Menu, stable table QR, table ordering, operational workflow; counter settlement only |
| Booking Venue | Website + Booking | Services/resources, availability, booking requests |
| Service Tracking | Website + Track | Ticket creation, business updates, secure customer progress lookup |
| Hospitality Operations | Website + Booking + Menu + optional Order | Only offer after rooms/resources and operating rules are truly complete |

An offer may set limits, but limits must be relevant and actually enforced. For example, QR tables matter only with Order; number of workflows matters only with Track. Avoid exposing a plan name such as STAR when it is an internal grandfathering status rather than a customer-facing offer.

### Create flow language

Use plain steps:

1. **What kind of business is this?** (template)
2. **What should customers be able to do?** (modules)
3. **What is included commercially?** (offer/term/limits)
4. **What needs setup before going live?** (readiness checklist)

## 7. Data and UI rules for connected website content

1. Business contact/profile fields are edited in one place and update the public site everywhere.
2. Menu items are edited in Menu; websites render them. The website editor must not duplicate prices/items.
3. Booking resources are edited in Booking; websites render active resources and availability.
4. Workflows/tickets are edited in Track; websites render only the real safe lookup entry point.
5. General business offerings need a future canonical offering/service model if they are not Menu or Booking resources. Do not use `SiteItem` as a shadow catalog.
6. Website content is for brand copy/layout/media—not operational records.
7. A website publish check must show missing requirements before exposing a CTA.

## 8. Delivery sequence before feature implementation

### Phase A — Decide and document the product contract

- Approve the module vocabulary: Website, Menu, Order & Table QR, Booking, Tracking.
- Confirm launch verticals; mark Hotel/Futsal/Swimming as planned unless generic Booking is generalized.
- Select one website data model and remove the other from the live tenant path.
- Select one entitlement authority; retire legacy plan controls from operator UI.

### Phase B — Correct unsafe and false current UI

- Remove the public fake Track demo.
- Correct home/package copy that promises QR payment or destructive “history reset.”
- Replace Super-admin Track Clients top-level navigation with a filtered universal Businesses experience.
- Hide/defer controls whose values do not govern runtime behavior.

### Phase C — Make roles and console navigation real

- Finish membership lifecycle and server-side role enforcement.
- Introduce one module-aware owner console, retaining old URLs as redirects only.
- Add readiness states and empty-state actions for each module.

### Phase D — Build only the needed operating slices

1. Harden restaurant Order and connected public menu.
2. Generalize Booking from Restaurant-only to Business-owned resources before supporting futsal/swimming.
3. Harden Track role/access and workflow history; connect its real lookup to public sites.
4. Add generic business offerings only after the website and module ownership contract is stable.

## 9. Decisions required before implementation begins

1. Which offers will be sold in the first launch? The recommended initial set is Digital Presence, Restaurant Menu/Operations, and Service Tracking; Booking Venue follows after generic booking work.
2. Does a business always receive Website, or can QEVYRA sell a private SaaS-only account? This plan assumes Website is universal.
3. Are Restaurant Order and customer payment intentionally separate? This plan assumes counter settlement; do not say “pay via QR.”
4. Which canonical website model will survive: evolve `Website`, or formally migrate it into `Site`? Do not maintain both.
5. Does the first release support composite businesses such as a hotel? If yes, modules—not business type routing—must be implemented first.
6. Is Booking a priority sufficient to generalize `BookableService` from `Restaurant` to `Business`? Futsal and swimming cannot be honestly supported until that decision is implemented.

## 10. Evidence behind this plan

- The home page currently markets Website/Order/Track, hard-coded demos, four conflicting packages, and “order and pay via QR”: `qevyra/src/app/(public)/page.tsx`, `src/lib/packages.ts`.
- Super-admin currently separates generic Businesses from Track Clients and treats Menu/QR only as data within Businesses: `src/app/(superadmin)/super-admin/layout.tsx`, `businesses/page.tsx`, `tracking/page.tsx`.
- The business creation screen combines product selection, package, legacy plan, table count, publishing, subscription and Star founder controls: `src/app/(superadmin)/super-admin/SuperAdminClient.tsx`.
- `BusinessType` currently selects a menu or track family: `src/lib/business-kind.ts`.
- Website editing targets `Website` while the public `/s/[slug]` renderer can prefer `Site`: `src/app/(business)/admin/website/*`, `src/modules/sites/services.ts`.
- The public Site tracking route is deliberately a non-live demo: `src/modules/sites/sections/track-demo.tsx`.

## 11. Explicit non-goals for the next implementation phase

- No generic custom workflow designer.
- No payments, refunds, accounting, marketplace, advertisements, or loyalty program.
- No full multi-location operating model.
- No marketing claim that Hotel, Futsal, Swimming, Retail commerce, or online payment is already complete.
- No second copy of business, menu, booking, or ticket data for the public website.
