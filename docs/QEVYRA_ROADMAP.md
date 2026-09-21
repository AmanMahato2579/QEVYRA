# QEVYRA — Roadmap

> Stage-by-stage delivery plan. Priority is **stability of the live product first**, then tenancy generalization, then new products. Every stage has scope AND a no-go rule.

> **2026 update (unified `qevyra` app):** the parallel plan in `qevyra/docs/QEVYRA_PLAN.md` governs the
> unified app. Under it, **Website v1 and Track v1 (ticket/job tracking — workflows, tickets, public
> `/track` page and `/admin/track`)** shipped together in `qevyra`, ahead of these repo-global stages.
> That modern, shipped Track semantics ("jobs tracked through a workflow") supersedes the timer-based
> TrackUnit/TrackSession model described in older docs below (see `qevyra/docs/QEVYRA_TRACK.md`).
> Stages below still apply to the standalone `modules/order/menu-saas` product.

---

## Stage 0 — Foundation (current)

- **Done:** audit (`CURRENT_SYSTEM_AUDIT.md`), target architecture, repository structure, migration map, rules, roadmap, DB evolution, root `README.md` + `AGENTS.md`, module placeholders (`order/`, `track/`, `website/`), product relocated to `modules/order/menu-saas`.
- **Gate:** docs consistent, product untouched and still lappable; final report delivered.

## Stage 1 — Order hardening (do no feature work)

Scope:
- Split `src/lib/db.ts` into cohesive server modules; zero behavior change.
- Centralized API guards + Zod request helpers; fix the customer-orders ownership gap.
- Delete orphaned duplicate `TablesClient.tsx`; verify live path only.
- Brand: introduce `platformName`-driven constants (default "QEVYRA"), retire hard-coded "MenuQR".
- Add Vitest around plan-catalog + session/order math; keep `e2e-smoke.mjs`.
- Housekeeping: remove `@supabase/*` + `nanoid` after import audit.

No-go: no schema changes, no new customer-facing features, no module extraction yet.

## Stage 2 — Tenancy & platform core

Scope:
- Additive `Business` migration (1 restaurant → 1 business) + `TenantLink`/resolver.
- Extract `src/modules/platform/*` (plans, settings, notifications/push, activity, i18n, guards) from `menu-saas/src/lib` via tested moves.
- Capability catalog generalization: `order.*` prefixes; overrides on `Business`; GOLD → capability grants.
- Order code begins moving toward `src/modules/order/`, imports rewritten centrally, smoke-gated.

No-go: no change to running schema beyond additive migration; no Track/Website features yet.

## Stage 3 — QEVYRA Track v1

Scope:
- Track data model (Business-scoped units/places, usage sessions, timers), authorizer, services, admin panels + customer storefront pages.
- `core/realtime` (SSE first) for timer updates; web-push reuse.
- Integration seam: Track uses Order's notify/push via platform core.

No-go: no order-family schema changes; no payments.

## Stage 4 — QEVYRA Website v1

Scope:
- Public business website (slug-based), QR landing, business profile from `Business`; SEO basics; website feature keys in the capability catalog.

## Stage 5 — Payments & billing platform

Scope:
- Payments integration; bill settlement per business; subscription invoicing; `core/billing`; media storage service.

## Stage 6+ — Connected platform

Scope:
- WhatsApp ordering/notifications; cross-platform customer network; loyalty/CRM; realtime upgrade to WS where justified; containerized self-host option.

---

## Guiding gates (apply to every stage)

| Gate | Check |
| --- | --- |
| Lint + typecheck | `npm run lint` and `npx tsc --noEmit` in `modules/order/menu-saas` (and each module app) |
| Build | `npm run build` of the affected app |
| Smoke | `node scripts/e2e-smoke.mjs` against dev server where relevant |
| Docs | `docs/*` + `AGENTS.md` updated in the same change |
| Rule check | No `ARCHITECTURE_RULES.md` violation introduced |

Stage advances only when its gate passes. Anything discovered mid-stage that expands scope gets scheduled, not folded in.