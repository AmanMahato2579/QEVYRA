# QEVYRA Modules

Modular-monolith boundaries (see `docs/QEVYRA_ARCHITECTURE.md`). A module owns a
product axis and depends only on platform core — never on another module.

Current boundaries and where the code lives today:

| Module | Domain | Current home |
| :--- | :--- | :--- |
| `core` | Business tenant, subscription/lifecycle, customers, QR, communication | `src/lib/plans.ts`, `plans-catalog.ts`, `settings.ts`, `activity.ts`, `auth.ts`, `auth-guard.ts` |
| `website` | Universal website engine (this module was refactored) | `src/modules/website/services.ts` |
| `order` | QR Menu SaaS engine | `src/lib/db.ts` (god-module — refactor tracked, do NOT casually rewrite) |
| `track` | Status tracking SaaS engine (tickets, workflows) | `src/modules/track/services.ts`, `catalog.ts` |

Rules:

1. **Business is the universal tenant.** Subscription/plan state lives on the
   Business row only. The ORDER module bridges through `Restaurant.businessId`.
2. Modules never couple to each other; they use platform core (`prisma`,
   `plans.ts` etc.) only.
3. Do not move working code between folders as a cosmetic exercise. Refactor a
   slice only when the change it enables lands in the same commit.