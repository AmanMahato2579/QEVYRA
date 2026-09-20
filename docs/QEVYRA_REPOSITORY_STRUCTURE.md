# QEVYRA — Repository Structure

> Target layout of the QEVYRA monorepo. Stage 0 creates only placeholders — the live product stays at `modules/order/menu-saas` untouched. Later stages restructure toward this shape **incrementally**.

---

## 1. Target structure (map)

```
QEVYRA/
├── README.md                          # platform overview, products, status
├── AGENTS.md                          # guide for AI agents working in this repo
├── docs/
│   ├── CURRENT_SYSTEM_AUDIT.md        # the system as it is today
│   ├── QEVYRA_ARCHITECTURE.md         # target architecture + principles
│   ├── QEVYRA_REPOSITORY_STRUCTURE.md # this file
│   ├── MIGRATION_MAP.md               # Keep / Move-later / Refactor-later / Replace-later
│   ├── ARCHITECTURE_RULES.md          # the must-follow engineering rules
│   ├── QEVYRA_ROADMAP.md              # stages with scope + no-go criteria
│   └── DATABASE_EVOLUTION.md          # current DB → transition → future schema
│
├── modules/
│   ├── README.md                      # how products map to modules
│   │
│   ├── order/                         # QEVYRA Order (the live product)
│   │   ├── menu-saas/                 # SELF-CONTAINED Next.js app — DO NOT TOUCH casually
│   │   │   ├── package.json           # own deps, own next config, own prisma
│   │   │   ├── prisma/                # own schema + migrations (append-only)
│   │   │   ├── src/                   # app router, components, lib, hooks, types
│   │   │   ├── scripts/               # prepare-db.mjs, e2e-smoke.mjs
│   │   │   ├── vercel.json            # own build pipeline
│   │   │   ├── docker-compose.yml     # local Postgres for dev only
│   │   │   ├── .env*                  # prisma/auth/web-push config (gitignored keys)
│   │   │   └── (its own README/AGENTS)
│   │   └── README.md                  # what Order is, how to run it
│   │
│   ├── track/                         # QEVYRA Track (PLACEHOLDER — no code yet)
│   │   └── README.md
│   │
│   └── website/                       # QEVYRA Website (PLACEHOLDER — no code yet)
│       └── README.md
```

---

## 2. Why this shape

- **One repo, one mind.** The whole platform is navigable from the root; `docs/` is the single source of architectural truth; `AGENTS.md` is the single entry point for AI agents.
- **Products are modules.** Each product directory carries its own identity, but modules are NOT system boundaries — see `QEVYRA_ARCHITECTURE.md` §2/§4. No module may depend on another module's internals.
- **The live app is frozen in place.** `menu-saas` remains a fully self-contained app (own `package.json`, own `vercel.json`, own Prisma). This is deliberate: we never rebuild the working product to make it "fit" — we move toward the shared shape via later additive stages.

---

## 3. Migration path to the target (later stages only)

1. **Stage 1** (order hardening): keep `menu-saas/` physical layout. Introduce centralized guards + validation helpers **inside** it (`src/lib/`). Split god-module. Most of the eventual "platform core" arrives first as refactors inside `menu-saas`.
2. **Stage 2** (tenancy): add `Business` migration; extract `src/modules/platform/` core inside the same app; then `src/modules/order/` as the future home of Order code, with `menu-saas/src` content moved by **safe, tested moves** (imports rewritten centrally).
3. **Stage 3+** (Track/Website): new modules under `src/modules/` created from day one with the module rules. `menu-saas` evolves into `src/modules/order` and the separate `modules/order/menu-saas` folder becomes a thin wrapper or disappears, per roadmap decision.
4. The `modules/<product>/` folders remain for product-level docs/scripts throughout the transition.

---

## 4. Root-level conventions

- `docs/` — architecture truth. Absolute requirement: no doc may contradict `ARCHITECTURE_RULES.md`.
- `modules/*` — one directory per product + README explaining the product, its current status, and its entry point for development.
- Never store secrets in git. `.env*` files are local; refer to `.env.example`.
- Every new module directory MUST ship with a README defining: purpose, tenant scope, dependencies (platform core only), entry points.