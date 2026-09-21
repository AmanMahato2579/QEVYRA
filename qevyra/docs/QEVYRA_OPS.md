# QEVYRA — Operations Runbook

Practical how-to for running, deploying, backing up and monitoring the QEVYRA app.

## Stack in one line

Next.js 16 App Router + Prisma 6 + PostgreSQL 16 (local: Docker `menu-saas-postgres`, database
`qevyra`) + NextAuth v5 (credentials + JWT) + Vercel deployment hooks.

## Local development

```bash
# 1) Database (Docker). NOTE: the shipped container uses db name menu_saas, but the real
#    app .env points at database `qevyra`. The container already holds the qevyra DB.
docker compose up -d postgres

# 2) Environment
copy .env.example .env          # then fill AUTH_SECRET, CRON_SECRET, VAPID keys

# 3) Migrations (never `db push` outside prepare-db fallback)
npx prisma migrate deploy
npx prisma generate

# 4) Run
npm run dev                     # http://localhost:3000
```

### Local environment facts (they differ from the README defaults)

| Item | Real value |
| :--- | :--- |
| App DB | `qevyra` (in `.env`), host `localhost:5432` = Docker container `menu-saas-postgres` |
| `.env.example` DB name | `menu_saas` — legacy; the working `.env` uses `qevyra` |
| Migration baseline | `20260920165056_qevyra_unified_baseline` (in `_prisma_migrations`) |
| Container | `menu-saas-postgres` (owned by an older compose project at `D:\Personal_Project\menu-saas`, so run `docker exec` directly, not `docker compose exec`) |
| Super-admin login | `admin@qevyra.com` / `Admin123!` |
| Demo owner login | `owner@demo.com` / `Owner123!` |

## Deploying to Vercel (or any host)

1. **Env vars** (Vercel → Project → Settings → Environment Variables): `DATABASE_URL`, `DIRECT_URL`
   (Supabase/Neon pooler + direct), `AUTH_SECRET`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`,
   `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `CRON_SECRET`.
2. **Schema to target DB**: `npx prisma migrate deploy` (migrations in `prisma/migrations/` are
   append-only — never edit an applied migration, never `db push` production).
3. **Build**: `npm run build`.
4. **Cron** for the nightly reset (01:00 Asia/Kathmandu): Vercel Cron `15 19 * * *` UTC hitting
   `/api/cron/daily-reset` (guarded by Vercel header; manual trigger: send `x-vercel-cron` header or
   the `CRON_SECRET` flow).

`scripts/prepare-db.mjs` is the CI helper: runs `migrate deploy`, and only if that fails (target was
created with `db push` historically) it baselines in-place. Its `BASELINE` constant matches the old
`menu_saas` lineage; newer DBs already carry `20260920165056_qevyra_unified_baseline`.

## Backups

```
node scripts/backup-db.mjs                 # → backups/qevyra-<timestamp>.dump (keeps last 14)
node scripts/restore-db.mjs --file backups/qevyra-<ts>.dump --yes   # DESTRUCTIVE restore
```

- Custom-format `pg_dump` inside the running container (`docker exec menu-saas-postgres pg_dump`),
  no local pg tools needed. `--host=` variant uses a native `pg_dump`/`pg_restore` instead.
- Restore uses `pg_restore --clean --if-exists --no-owner` and **overwrites** the current database.
- Verified end-to-end 2026-09-21: dump→restore into a scratch DB reproduced all 3 migrations and
  tables (`OrderSequence`, `WorkflowSequence`, `Order` columns `clientRequestId`/`serviceChargeAmount`).
- Suggested schedule: nightly (e.g. 04:00 UTC) via any cron/CI runner; off-site copy the `backups/`
  dir or mirror it to object storage.

## Health & smoke checks

- `GET /api/health` → `{"ok":true,"db":"up"}` (503 when the DB ping fails). Wire into any uptime
  monitor.
- `node scripts/e2e-smoke.mjs` — key-page smoke test; needs the dev server running
  (`npm run dev`).
- `GET /sitemap.xml` returns static + published-business URLs; `GET /robots.txt` disallows
  `/admin`, `/super-admin`, `/login`, `/api/`.

## Known Windows quirks

- `npm run build` while the dev server is running fails with a Prisma engine DLL EPERM — stop the
  dev server first.
- `prisma migrate dev` needs a TTY; on Windows PowerShell use the recorded flow:
  `npx prisma migrate diff --from-url <DATABASE_URL> --to-schema-datamodel prisma/schema.prisma --script`
  → save to `prisma/migrations/<timestamp>_<name>/migration.sql` → `npx prisma migrate deploy`.
- The compose file still carries a stale `version:` key (harmless warning).

## Rule of thumb

Anything that changed the data model must ship as a new migration, update `docs/*` in the same
change, and pass lint + typecheck + build before handoff.