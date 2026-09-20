# modules — QEVYRA product modules

One directory per product. Documentation here; code lives inside each product's own scope.

| Module | Product | Status |
| --- | --- | --- |
| `order/` | QEVYRA Order — QR menu, ordering, bookings, billing | **Live** (`order/menu-saas`) |
| `track/` | QEVYRA Track — place/venue digital usage | Placeholder |
| `website/` | QEVYRA Website — on-platform business website | Placeholder |

Rules for this directory:

- Modules are NOT system boundaries — they are vertical slices over one app and one DB.
- A feature module may depend only on the platform core, never on another module (see `docs/ARCHITECTURE_RULES.md`).
- Every module ships a README covering: purpose, tenant scope, dependencies, entry point.