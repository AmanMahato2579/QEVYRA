# QEVYRA Website

Public business website product. **Live in `qevyra/`** (this folder is a product placeholder only).

## Scope (live)

- Public storefront per business, rendered at `/s/[slug]` (single canonical public route).
- Owner editor (`Website` model) under `/admin/website`; `Site` engine bridges legacy content.
- Website content is a projection of canonical business data — never a second database.

## This folder

No code here. Development happens in `qevyra/src/modules/website/` and `qevyra/src/modules/sites/`. See root `AGENTS.md` and `qevyra/README.md`.