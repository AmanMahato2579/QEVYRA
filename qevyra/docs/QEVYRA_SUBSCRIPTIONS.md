# QEVYRA — Subscriptions & Plan Capabilities

Source of truth: `Business.plan` → `Plan` (DB row) → `plans.ts` (`getEffectiveAccess`). Nothing
gates on `business.plan === "…"` directly; capabilities travel as `features`/`limits` objects.

## Pipeline (verified in plans.ts + plan-catalog.ts)

```
Business ──> Plan row (featureKeys JSON / limitKeys JSON / allCurrentFeatures marker)
          ─> getEffectiveAccess(business) ─> { plan, isStar, starNumber, features{}, limits{} }
          ─> canUse(access, key) / canOrder / canBook / effectiveTableLimit
```

- STAR stores `ALL_CURRENT_FEATURES` so every current AND future catalog feature is granted.
- Overrides: `featureOverrides` / `limitOverrides` JSON on Business (lightweight, no table churn).
- `isBusinessOperational` → active + (never expires OR not expired) (+grace with autoOff=false).
- `enforceSubscriptionState` lazily deactivates Business + linked Restaurants on expiry (autoOff on).
- Catalog: keys incl. `business_website`, `business_track`, `ordering`, `table_ordering`,
  `order_management`, `kitchen_workflow`, `order_history`, `bookings`, `qr_tables`, limits
  `qrTables` (only limit defined so far).

## Tier table (Order + platform)

| Tier | Grant (verified defaults) | UI |
| :--- | :--- | :--- |
| BRONZE | profile, digital_menu, menu_management, qr_tables(10) | Web + view-only menu; no ordering |
| SILVER | + ordering, table_ordering, order_management, kitchen_workflow, order_history; qrTables(20) | Full ordering |
| STAR | ALL_CURRENT_FEATURES | founding; qrTables(50) + overrides |
| GOLD | — | **Not exposed.** Not in PLAN_IDS/DEFAULT_PLAN_CONFIGS; Plan.isVisible ready for future |

## Track capability plan (planned additions — decision with user)

Track should use the same pipeline with its own catalog entries. Pending data-model decision
(see QEVYRA_DATABASE.md / ask user):

- Feature key(s): `business_track` exists; add granular keys if tiers demand (e.g. `track_tickets`,
  `track_workflows`).
- Limit key(s): add to `LIMIT_CATALOG` (e.g. `workflows`, `activeTickets`) — schema comment
  already hints `"workflows": 2`. The `limitKeys` JSON on Plan already supports arbitrary keys; only
  code + catalog entry + a Plan row's limits need adding.

## Centralized access rule

`plans.ts` remains the ONLY place that computes capabilities. Order/Track/Website consumers call
`getEffectiveAccess`/`canUse`/facades. Admin UI may also hide unsupported actions, but **server-side
enforcement is the real gate** (audit §6-12).

## Verification status

- Existing behavior (plans pipeline, tier gating on Order surfaces) — VERIFIED via code inspection +
  tsc/build green. Behavioral smoke for BRONZE view-only on the new slug menu is planned in Phase O1.