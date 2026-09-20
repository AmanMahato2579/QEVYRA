# QEVYRA — Database Evolution

> How the single PostgreSQL schema moves from **current** (`Restaurant`-tenanted, Order-only) to **transition** (additive `Business`) to **future** (multi-product capability-driven). Always append-only migrations.

---

## 1. Current state (live, Order product)

16 models / 8 enums. Tenant = `Restaurant`. Order-family tables carry `restaurantId`:

- Identity/auth: `User` (role ∈ SUPER_ADMIN, RESTAURANT_ADMIN)
- Tenant: `Restaurant` (profile, billing %, plan + subscription fields, star fields, feature/limit override JSON)
- Order: `Table`, `TableSession`, `Category`, `MenuItem`, `MenuItemVariant`, `Order`, `OrderItem`, `OrderSequence`
- Engagement: `Notification`, `BookableService`, `Booking`, `PushSubscription`
- Platform: `Plan`, `AdminActivity`, `PlatformSetting`

Key integrity facts: unique `(restaurantId, orderNumber)`; per-restaurant `OrderSequence`; `DECIMAL(10,2)` money; `OrderItem` snapshots; per-item status machine; 24h retention anchored to `statusChangedAt`.

## 2. Transition (Stage 2, additive only)

New table + resolver; **no existing column changes**:

```
Business (
  id            text pk
  type          BusinessType   -- RESTAURANT | HOTEL | HOMESTAY | RETAIL | SERVICE | OTHER
  tenantSlug    text unique    -- the universal public handle
  platformName  text           -- per-business brand override
  planId        FK -> Plan     -- move here from Restaurant.planId
  subscription…               -- subscription fields move here
  featureOverrides json
  limitOverrides json
  isActive      bool
  createdAt     createdUpdatedAt…
)

TenantLink (
  businessId    FK -> Business
  orderId       text FK -> Restaurant.id (unique)  -- 1:1 during transition
)
```

Rules:
- Migration `add_business_tenancy` creates `Business` + `TenantLink`, backfills one `Business` per existing `Restaurant` (type RESTAURANT), copies plan/subscription/override fields, sets `tenantSlug = restaurant.slug`.
- `Restaurant` keeps `planId` etc. until a later drop stage — Order code untouched during Stage 2.
- New Track/Website tables are created with `businessId` FK from day one (no link needed).
- A `TenantResolver` returns `businessId` for both Order (via link) and new modules.

## 3. Future (Stage 2+, coherent end-state)

Post capability-generalization and after smoke-verified app transitions:

- `Restaurant.planId/subscription*` removed; all plan fields live on `Business`.
- Tenant column migration **on Order tables**: `restaurantId → businessId` in one dedicated, smoke-gated migration (FK now points to `Business`). `TenantLink` and `Restaurant.restaurantId` references are retired once verified.
- `Restaurant` becomes the Order **profile extension** (menu templates, QR settings) referenced by `Business`, or fully folded into Order module tables — decided at Stage 2 completion.

Future product tables (owned by their modules):

```
Track            TrackUnit (businessId, place, status), TrackSession (usage timer,
                 pricing snapshot), TrackEvent (audit of start/stop/break, push hooks)
Website          WebsitePage businessId-scoped, WebsiteLink (for QR/discovery)
Platform         PlatformLog (superset of AdminActivity), MediaAsset
```

Capability/plan model:

- `FeatureKey` catalog with `product.*` prefixes (order.ordering, track.usage, …); `Plan.featureKeys` in JSON; `Business.featureOverrides` merges on top.
- No reserved GOLD plan id.

## 4. Never again

- Editing applied migrations.
- `db push` on production.
- New tables without a tenant key.
- Locking storage layout to one product's feature set — product features are flags, storage is platform-owned.