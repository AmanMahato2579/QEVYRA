# QEVYRA Track

Service-business ticket/workflow tracking product. **Live in `qevyra/`** (this folder is a product placeholder only).

## Scope (live)

- Configurable ordered workflows (`Workflow`, `WorkflowStep`) per business.
- Tickets with status history, line items, and a high-entropy `publicToken`.
- Secure customer tracking at `/track/[code]` (token-resolved; code+phone fallback, rate-limited).
- Admin at `/track-admin`; APIs under `/api/admin/track/`.

## This folder

No code here. Development happens in `qevyra/src/modules/track/`. See root `AGENTS.md` and `qevyra/README.md`.