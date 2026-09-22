# QEVYRA — Architecture Rules

> Non-negotiable engineering rules for working in this repository. Any doc, module, or PR that contradicts these rules must be rejected. These rules govern every future AI agent (see root `AGENTS.md`).

---

## A. Product & safety rules

1. **Never break the deployed product.** `modules/order/menu-saas` is live. Verify (lint/build/smoke) before and after any change. No unverified change ships.
2. **Working code > cosmetic restructuring.** Refactors are allowed only when behavior-preserving and staged separately from schema changes.
3. **No module → module coupling, ever.** A feature module depends only on the platform core (`src/modules/platform`).
4. **API routes stay thin.** Route = guard → validate (Zod) → call service → reply. No business logic in components or in `app/api` directly.
5. **`prisma/migrations/` is append-only.** Never edit an applied migration. New changes are new migrations.
6. **Never `prisma db push` against production** (Vercel/Supabase). Dev-only for local `docker-compose` DB. `prepare-db.mjs` handles legacy baselines.
7. **Tenant isolation is mandatory** (see B). Every DB read/write goes through tenant-scoped services.

## B. Tenancy & security rules

8. **Every table carries a tenant key.** Today `restaurantId`; after tenancy migration, `businessId`. New tables ship with `businessId` from day one.
9. **No cross-tenant data flow.** Server code must derive the tenant from the authenticated session context — never from a client-supplied id alone for writes; public/anonymous reads re-validate ownership server-side (e.g. QR token + slug + `isActive`).
10. **Roles stay minimal.** `SUPER_ADMIN` / `RESTAURANT_ADMIN` / `TRACKING_ADMIN` today; extend only through a deliberate, documented change. No new ad-hoc role checks in routes — use `src/lib/auth-guard.ts`.
11. **Never log or store secrets** (passwords, VAPID private key, Prod DB URL). Seed/demo credentials only in `.env.example`.

## C. Data rules

12. **One PostgreSQL database.** No per-industry databases, no schema forks. Industry differences are data (Business type enum), not schema.
13. **Money math is server-side and pure.** Prices, tax, service charge, order totals, bill totals: computed in one authoritative place (pattern of `buildOrderItems`/`recomputeOrderTotals`), unit-tested, using `DECIMAL` columns.
14. **Enums are data.** Their meaning (and string values in DB) is part of the data contract; renaming is a migration, not a rename refactor, and only if it earns its cost.
15. **Append-only audit.** Platform mutations go through `AdminActivity` (later `PlatformLog`). Deletes are factual where products require them (24h order retention is a product spec).

## D. Code & quality rules

16. **No comments unless they explain why.** Code should read itself; a comment that restates the code is noise (repo standard).
17. **Pure logic stays pure.** Catalogs, session math, pricing math: no `prisma`, no `next/headers`, import-safe for client. Anything importing server-only modules is server-only and marked accordingly.
18. **New dependencies require a reason + removal path.** Before adding a package, check what exists (e.g. Radix, cva). Unused deps (`@supabase/*`, `nanoid`) are cleaned, never piled on.
19. **Docs are truth and stay in sync.** Any structural/schema/rule change updates `docs/` (and `AGENTS.md`) in the same change. Contradicting docs are bugs.
20. **Verify gates exist for every stage.** Each roadmap gate: lint + typecheck + build (order app) + smoke where applicable. No gate = no advance.

## E. Workflow rules

21. **One migration axis per stage.** Never combine schema change + tenancy refactor + brand rename in one pass (`MIGRATION_MAP.md` §6).
22. **The repo is not committed automatically.** Never commit unless the user explicitly asks.
23. **When in doubt, ask.** Ambiguity over module scope, plan semantics, or data model → clarify with the user before writing code.