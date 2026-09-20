# QEVYRA — Public Flows (customer journeys)

The three public entry points and the complete customer paths through them. Verdicts about what
runs today vs planned are in QEVYRA_PLAN.md §7.

## Flow A — QR menu/order (restaurant, VERIFIED path)

```
Customer scans table QR
  └─ /r/{slug}/t/{token}           (menu, table session auto-created)
       ├─ menu → cart → place order → order confirmation    (SILVER/STAR)
       └─ order shown to staff in /admin/orders → status updates → customer bill
```

## Flow B — business website → service buttons (planned W2 + O1/T1)

```
QEVYRA.com ──> b/{businessSlug}   (one template, themed)
   ├─ [View Menu]     ──> /r/{slug} (slug menu, Phase O1)  ── or ──> table QR flow
   ├─ [Track Service] ──> /track/{code}/entry               (Phase T1)
   └─ (no buttons for normal business) — About/Services/Contact/Reviews shown instead
```

Rule (audit §6-14): a service button appears ONLY when the corresponding capability is real
(Restaurant ↔ Business link for menu; Workflow ↔ Business link for track) and the plan feature is
granted. Never show a fake Menu/Tracking button.

## Flow C — tracking page (planned T1)

```
b/{slug} → Track Service → /track entry (type code) OR direct /track/{code} (from QR/link)
  └─ ticket status page: business name, code, service type,
       timeline (Received → Processing → Ready → Completed), contact/WhatsApp
```

## Flow D — website-only business (planned W2)

Business without Order/Track data: complete professional website (About, Services, Contact,
Location, WhatsApp, Reviews) with NO service area.

## Cross-cutting rules

- Public pages are server-reads over SaaS data; they never mutate (exceptions: order placement flow
  which legitimately writes to the Order DB, and table-session creation).
- Multi-tenant: public pages expose only their own business's data by construction (slug / token /
  code). Tracking codes never leak another business's rows.
- WhatsApp/Call are channels; state stays in Postgres.
- Mobile-first; reusable design system; no unnecessary animations or libraries.