# QEVYRA Website — QEVYRA.com + Business Websites

> Execution plan for the public website axis (phases W1 and W2 in QEVYRA_PLAN.md). W1 and W2 are
> built (see QEVYRA_PLAN.md §7); this file tracks remaining website work.

## 1. QEVYRA.com — company website

Rebuilt `/` (`src/app/(public)/page.tsx`) from the old MenuQR marketing page into a QEVYRA company site.

**Status: built (Phase W1).** `/` now renders QEVYRA branding, hero, products (Website/Order/Track),
how-it-works, pricing packages (₹ offers from `src/lib/packages.ts`), contact, and a login CTA. Root
metadata, `public/manifest.json` (`start_url: "/"`, name/short_name QEVYRA) and the `/login` brand
text were updated in the same change. Verified: dev-smoke returned 200 with the expected sections.

Sections:
- Header: QEVYRA branding, main nav (Products, Pricing, Contact), Login / Business CTA.
- Hero: explain the platform in one sentence ("One QR + link for your website, menu and service tracking").
- Products: three cards — QEVYRA Website, QEVYRA Order, QEVYRA Track (each: what it does, who it's for, primary CTA).
- How it works: the 3-experience flow diagram (QEVYRA.com → business website → menu/tracking page).
- Pricing: four packages (Website ₹2,500/1.5y; Website+QR menu ₹2,500/y; Restaurant setup+monthly; Tracking custom) with mailto CTA on custom plans.
- Footer: brand, terms/privacy placeholders, login link.

Rules unchanged: presentation-only, no per-industry features, no SaaS logic in this page.
The MenuQR→QEVYRA cross-cutting rename (admin metadata/headers, table-QR footer, super-admin layout,
platform default name, push subject, service worker) shipped 2026-09-21; no `MenuQR` strings remain
in `src`.

## 2. Business website — template system (Phase W2, planned)

**Design constraint (binding):** one template system serving every business type. No
`RestaurantWebsite.tsx` / `GarageWebsite.tsx` / `TailorWebsite.tsx` files. A single
Business-website component consumes:

1. **Business** (identity + contact): name, slug, description, logo, cover, phone, whatsapp,
   address, mapUrl, openingHours, language, brandColor, isActive.
2. **Website** (content): hero/about/services blurb/contact/footer/SEO fields, themeId,
   isPublished (only published + active business is served publicly — `getPublicWebsite`).
3. **Enabled services** → derive action buttons.

### Service-button derivation (Phase W2 core logic)

Rendered when the corresponding capability is real, never faked:

| Business state | Button(s) | Target |
| :--- | :--- | :--- |
| Restaurant linked AND `digital_menu` feature | **View Menu** | `/r/{restaurantSlug}` (Phase O1) |
| Restaurant linked AND `ordering` feature | View Menu (same button) | Order public menu (slug or table flow) |
| Workflow linked AND `business_track` feature | **Track Service** | `/track` entry (Phase T1) |
| No Order data and no Track data | none — plain website sections | — |

Implementation shape: `modules/website` gains a query `websiteEntryForBusiness(businessId)` (uses a
core-facade `order.hasRestaurant(businessId)` + `track.hasWorkflow(businessId)`) and the page renders
buttons from that. The website module must NOT import order/track modules directly — it calls core
facades. (Planned, not yet built.)

Themes: reuse the existing `WebsiteTheme` presets (primaryColor/background/fontFamily) + existing
theme from `modules/website/services.ts`. Optional planned schema additions (Phase W2): social links
(`socialLinks` on website or business), google review URL/rating field, so normal businesses can
show reviews — decision deferred to the docs/database doc and the user.

## 3. What exists (verified)

- `/b/{slug}` page renders a themed storefront from Business + Website content (dev smoke: 200).
- `/admin/website` editor: theme picker, hero/about/services/contact/SEO sections, preview,
  save-draft/publish; gated on `business_website` feature.
- `/api/admin/website` GET auto-creates a draft on first visit; PATCH upserts content.
- `modules/website/services.ts`: `getPublicWebsite`, `getWebsiteForBusiness`, `listWebsiteThemes`,
  `validThemeId`.

## 4. Definition of done (W1 + W2)

- `/` is QEVYRA-branded with Products/Pricing/Contact/Login.
- One template renders a restaurant, a track business, and a normal business — correct buttons, no
  fake button when no engine is linked; normal business looks complete without a service section.
- lint + typecheck + build green; `/b/demo-restaurant` and `/b` non-restaurant cases smoke-tested.
- docs/QEVYRA_WEBSITE.md updated in the same change.