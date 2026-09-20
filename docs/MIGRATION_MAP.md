# QEVYRA — Migration Map

> What happens to **every existing asset** of `menu-saas` as QEVYRA evolves. Categories: **Keep** (unchanged), **Move later**, **Refactor later**, **Replace later**. Nothing here changes the working product during Stage 0.

---

## 1. Keep as-is (do not touch in Stage 0)

| Asset | Why |
| --- | --- |
| `prisma/schema.prisma` + all `prisma/migrations/*` | Append-only data truth; editing breaks production |
| `scripts/prepare-db.mjs` | Vercel build self-heal for `db push`-created databases |
| `src/lib/prisma.ts` (client singleton) | Fine as-is |
| Auth wiring: `src/auth.config.ts`, `src/lib/auth.ts`, `src/proxy.ts` | Verified, small, working |
| `src/lib/session-math.ts` | Pure, used by both server pages and client |
| `src/lib/plan-catalog.ts`, `src/lib/plans.ts` | Foundational; generalizes later |
| `src/lib/notifications.ts`, `push.ts` | Reusable platform services already |
| `src/lib/settings.ts`, `activity.ts`, `i18n.ts`, `customer-storage.ts`, `utils.ts`, `guest-helpers` | Small, cohesive |
| Table QR flow (`qrcode`, `qrcode.react`), poster generator | Product feature, works |
| `docker-compose.yml` (local Postgres), `vercel.json` | Infra that works |
| PWA `manifest.json`, `sw.js` (push-only behavior) | Works; keep push-only |

## 2. Move later (relocation without behavior change)

| Asset | Move to | Stage |
| --- | --- | --- |
| `src/lib/plans.ts` + `plan-catalog.ts` | `src/modules/platform/plans/` | 2 (tenancy/platform-core) |
| Settings, activity, notification/push, i18n | `src/modules/platform/` services | 2 |
| `admin/`, `super-admin/` page layouts + shells | later `src/modules/order/` (with tested import rewrites) | 2 |
| `scripts/e2e-smoke.mjs` | product `scripts/` stays; root CI harness later | 3 |

Move rule: **a file moves only when its imports compile and the running app still passes smoke/lint**. Bulk moves are not cosmetic restructures.

## 3. Refactor later (behavior-preserving, staged)

| Asset | Refactor into | Stage |
| --- | --- | --- |
| `src/lib/db.ts` (~930-line god-module) | `src/lib/{menu,sessions,orders,bookings,billing,cleanup}.ts` | 1 |
| Inline per-route auth/role/tenant checks | central `src/lib/guards.ts` API guard + Zod request helpers | 1 |
| Brand literal "MenuQR" | single `platformName`-driven constant (start using `PlatformSetting`), QEVYRA defaults | 1 |
| Orphaned duplicate `src/components/admin/TablesClient.tsx` | delete duplicate (live one at `src/app/admin/tables/TablesClient.tsx`) | 1 |
| Polling + `router.refresh()` | `core/realtime` SSE/WS (feature-gated) | 3+ |
| `GET /api/customer/sessions/[sessionId]/orders` missing restaurantId ownership check | enforce via central guard + ownership check | 1 |
| Ad-hoc response shapes | small shared `apiResponse` helpers | 1 |

## 4. Replace later (with clear replacement, never silently)

| Asset | Replacement | Stage |
| --- | --- | --- |
| Dedicated `Restaurant` as the only tenant | `Business` superset + TenantLink (Restaurant becomes Order profile) | 2 |
| `ALL_CURRENT_FEATURES` marker | explicit capability catalog with per-product prefixes | 2 |
| GOLD plan (comment-only) | capability grants / overrides; no reserved plan id | 2 |
| Unused deps `@supabase/*`, `nanoid` | remove in a housekeeping pass (verify no imports first) | 1 |
| No Dockerfile | containerized self-host option (runbook parity with DEPLOYMENT.md) | 5+ |
| No test framework | Vitest for pure logic + route tests; keep smoke script | 1 |

## 5. Explicitly NOT migrating

- Legacy `OrderStatus` values `READY`/`COMPLETED` — intentionally rejected at the route; current intake-only machine is the product spec. Keep.
- The 24h order retention/cleanup model — product behavior; only the cron runner location may change.
- Existing enums & their DB meaning — renaming deferred behind safe rename migrations only if genuinely needed; otherwise keep names.

## 6. Migration ordering principle

**Never co-migrate storage + code + brand at once.** Each migration axis (schema, tenancy, module shape, brand) is its own stage with its own verify gate — see `QEVYRA_ROADMAP.md` for gates.