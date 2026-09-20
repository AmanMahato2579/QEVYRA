# QEVYRA — Routing

Full URL map: what exists **now** vs **planned**. All current URLs are preserved; route-group
folders changed already (same URLs, new grouping).

## Public (`(public)`)

| URL | What | Status |
| :--- | :--- | :--- |
| `/` | QEVYRA.com company website | Rebuild planned (Phase W1); currently MenuQR-branded marketing page |
| `/login` | Auth sign-in | Exists |
| `/inactive` | Account/subscription inactive notice | Exists |
| `/b/{businessSlug}` | Business public website | Exists (Phase W2 adds service buttons) |
| `/r/{restaurantSlug}` | Slug-level public menu (no table) | **Planned** (Phase O1) |
| `/r/{restaurantSlug}/t/{tableToken}` | QR table menu (menu/cart/order/bill/book) | Exists |
| `/track/{trackingCode}` | Public ticket tracking page | **Planned** (Phase T1) |

## Business admin (`(business)`)

| URL | What | Status |
| :--- | :--- | :--- |
| `/admin` | Order dashboard (plan/tables status) | Exists |
| `/admin/menu`, `/admin/menu/categories`, `/admin/menu/items/…` | Menu CRUD | Exists |
| `/admin/tables`, `/admin/service`, `/admin/service/{tableId}` | Tables + QR + table service | Exists |
| `/admin/orders`, `/admin/notifications`, `/admin/bookings`, `/admin/bookings/services` | Operations | Exists |
| `/admin/settings` | Restaurant settings | Exists |
| `/admin/website` | Business website editor | Exists |
| `/admin/track/…` | Track SaaS admin (workflows, tickets) | **Planned** (Phase T2) |

## Platform admin (`(superadmin)`)

| URL | What | Status |
| :--- | :--- | :--- |
| `/super-admin`, `/super-admin/restaurants`, `/super-admin/plans`, `/super-admin/settings`, `/super-admin/activity` | Platform management (Business-driven) | Exists |

## API routes

| URL | What |
| :--- | :--- |
| `/api/auth/…` | NextAuth (credentials + JWT) |
| `/api/admin/website` | Website engine: GET (auto-draft) / PATCH (upsert draft/publish) |
| `/api/admin/…` (menu/tables/orders/bookings/etc.) | Order admin API (existing) |
| `/api/admin/track/…` | Track admin API (**planned**, Phase T2) |

## Middleware / route protection

- `src/proxy.ts` (middleware) redirects unauthenticated `/admin` and `/super-admin` to `/login`;
  public pages are open.
- Guards re-validate server-side per request (`auth-guard.ts`, business + subscription state).
- Track admin (when built) must follow the same pattern: auth → tenant → plan capability.