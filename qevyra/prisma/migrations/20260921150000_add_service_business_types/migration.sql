-- AltBusinessType: add service-line names so each business category gets its own
-- branded website buttons (TAILOR, DRY_CLEANING, GARAGE, CLEANING, REPAIR).
-- Postgres 16 supports multiple ADD VALUE clauses in a single ALTER TYPE.
ALTER TYPE "BusinessType" ADD VALUE 'TAILOR';
ALTER TYPE "BusinessType" ADD VALUE 'DRY_CLEANING';
ALTER TYPE "BusinessType" ADD VALUE 'GARAGE';
ALTER TYPE "BusinessType" ADD VALUE 'CLEANING';
ALTER TYPE "BusinessType" ADD VALUE 'REPAIR';