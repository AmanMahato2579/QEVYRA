# QEVYRA — Sites Module (Phase A)

## Purpose

The `sites` module provides lightweight, template-driven public storefronts under `/s/[slug]`.
It serves three core business archetypes through dedicated templates reading from the PostgreSQL database:

1. **GENERAL**: Neighborhood retail & general stores (e.g. Kirana / grocery shops).
2. **TRACKING**: Service-based shops requiring order status tracking (e.g. Tailors, Garages, Repair workshops).
3. **MENU**: Food & hospitality venues offering digital view-only menus and reservations (e.g. Hotels, Cafes, Restaurants).

## Routes (`src/app/(sites)/s/[slug]/`)

All routes are thin server components that invoke only `src/modules/sites/services.ts`. If a site is unpublished or its linked `Business.isActive` is false, it returns `404 notFound()`.

- `/s/[slug]` — Primary storefront landing page rendered according to the site type and active layout options.
- `/s/[slug]/items` — Available items / product catalog for `GENERAL` sites (404 if type is not `GENERAL` or `enableItems` is false) with optional ad banner.
- `/s/[slug]/menu` — View-only digital menu for `MENU` sites with "Book by calling" notice (404 if type is not `MENU` or `enableItems` is false) with optional ad banner.
- `/s/[slug]/track` — Interactive demo order tracking page with mobile number lookup, 4-step progress visualization, and "Price: not updated yet" (404 if `enableTrackOrder` is false) with optional ad banner.

All `/s/[slug]` routes include `robots: { index: false, follow: false }` metadata and are excluded from `sitemap.ts`.

## Folder Structure

```
src/
├── app/(sites)/s/[slug]/
│   ├── layout.tsx             # Route group layout enforcing noindex metadata
│   ├── page.tsx               # Home landing page renderer
│   ├── items/page.tsx         # GENERAL items catalog + ads
│   ├── menu/page.tsx          # MENU dishes/services + ads
│   └── track/page.tsx         # Order tracking demo + ads
└── modules/sites/
    ├── types.ts               # Zod schemas, safeLink validators, TypeScript interfaces
    ├── services.ts            # DB service layer (getSiteBySlug, getActiveAds)
    ├── layouts.ts             # Template section sequences & applyOptions filter
    ├── TemplateRenderer.tsx   # Order-preserving section renderer & CSS variable injector
    ├── SectionContainer.tsx   # Shared responsive layout container (max-w-xl md:max-w-6xl px-4 md:px-6 lg:px-8)
    └── sections/              # 15 modular section components
        ├── header.tsx         # Logo, business title, quick action buttons
        ├── hero.tsx           # Welcome banner, hero image, about copy
        ├── what-we-do.tsx     # Highlights showcase grid
        ├── story.tsx          # Brand story narrative
        ├── main-buttons.tsx   # Primary CTAs (View items / View menu / Track / Book)
        ├── visit-us.tsx       # Physical address & Google Maps link
        ├── contact.tsx        # Phone and WhatsApp quick chat cards
        ├── opening-hours.tsx  # Operating hours card
        ├── google-review.tsx  # Google Review call-to-action
        ├── social.tsx         # Verified social media channels
        ├── item-list.tsx      # General product listing
        ├── menu-view.tsx      # Categorized menu with phone ordering prompt
        ├── track-demo.tsx     # Interactive tracking timeline demonstration
        ├── ad-banner.tsx      # Platform sponsored advertisement banner
        └── footer.tsx         # Copyright & "Powered by QEVYRA"
```

## Options Configuration

Each site record contains boolean switches that dynamically control UI sections and route access:

- `enableItems`: Toggles the item/menu highlight CTA and enables `/s/[slug]/items` or `/s/[slug]/menu`.
- `enableTrackOrder`: Toggles the "Track order" button on the home page and enables `/s/[slug]/track`.
- `enableAds`: Toggles rendering of platform sponsor banners on inner pages (`items`, `menu`, `track`).
- `enableBooking`: Displays the "Call to book" direct telephone link button on home and menu pages.

> **Note on Schema Defaults & CMS Initialization:** In the database schema, all `enable*` columns default to `false` (`@default(false)`). When creating new sites or switching archetype templates, the administrative CMS is responsible for applying the archetype-specific default options (e.g. enabling `enableItems` for `GENERAL` and `MENU`, `enableTrackOrder` for `TRACKING`, etc.).

## Responsive Layout System

The `/s/[slug]` storefronts adapt seamlessly from mobile viewports (320px–767px) to wide desktop screens (768px–1920px) without horizontal scrolling:

- **SectionContainer**: Single shared layout component (`src/modules/sites/SectionContainer.tsx`) standardizing `"w-full max-w-xl md:max-w-6xl mx-auto px-4 md:px-6 lg:px-8"` across all sections, inner templates, and header/footer inner contents so left and right edges line up identically at every width.
- **Header & Footer Alignment**: Full-width backgrounds with content wrapped in `SectionContainer as="div"`, ensuring edges line up perfectly with sections below at every width.
- **Hero**: Stacks image-over-text on mobile; transforms to a balanced 2-column layout on `lg:` with copy and headline on the left and large rounded hero image on the right.
- **Highlights (`what-we-do`)**: 1–2 columns on mobile; dynamic responsive grid (2 columns on `md:`, 2 to 4 on `lg:` based on item count) preventing half-empty rows.
- **Story & Buttons Grouping**: Rendered via typed `groupSections` in `layouts.ts` and `TemplateRenderer.tsx`. On `lg:`, Story occupies ~2/3 (`lg:col-span-2`) while Action Buttons occupy ~1/3 (`lg:col-span-1`) in a neat vertical stack. On mobile, components remain sequentially stacked and full-width.
- **Bottom Information Area**: Supported across all templates (`GENERAL`, `TRACKING`, `MENU`), displaying cells only when data is present (`visit-us`, `contact`, `opening-hours`, `google-review`, `social`). Responsive grid: 1 column stacked on mobile, 2 columns on `md:`, 3 columns on `lg:`, and a single stretched row of cells from `xl:` (1280px and up) to avoid text cramping.
- **Catalog & Demo Pages**: `items` renders a 2-to-4 column product grid; `menu` arranges categories across 2 columns on `lg:`; `track` centers the demo timeline at a readable `max-w-2xl`; `ad-banner` presents multiple sponsors side-by-side on `md:`.
- **Readability & Assets**: Prose widths constrained (`max-w-prose`) to maintain ~70 characters per line. Images enforce `object-cover` with fixed aspect ratios to eliminate layout shifts.

## Architectural Boundaries

- The `sites` module strictly imports from `@/lib/*`, generic `@/components/ui/*`, and internal files within `src/modules/sites/`.
- No direct coupling to `modules/order`, `modules/track`, or `modules/website`.
- Every `Site` is tied 1:1 to a tenant `Business` via required `businessId` foreign key. Child tables (`SiteHighlight`, `SiteItem`) carry both `siteId` and `businessId` composite indexes.
- Database access is exclusively isolated to `src/modules/sites/services.ts`.

## Local Seeding

Run `sites:seed` on local development environments only:

```bash
npm run sites:seed
```

- The seed script refuses execution if `NODE_ENV === "production"` or if the `VERCEL` environment variable is defined.
- It upserts records idempotently without duplicating data upon multiple executions.

## What is NOT Built Yet (Future Phases)

- CMS or super-admin editing pages for sites.
- Public or private API routes for site mutations.
- Authentication or role-based access controls for site owners.
- Real production tracking backend / ticket state machine integration.
- Impression or ad-click analytics.
- Image file upload pipelines (uses hosted URLs in Phase A).
- Multilingual language switcher.
- Draft vs published revision versioning.
