-- QEVYRA — Website social & Google-rating snapshot columns (Phase W2, planned).
-- Append-only migration. Additive, nullable-only: NO existing column is renamed,
-- retyped, backfilled, or dropped. Null default means we NEVER fabricate a
-- rating/social for a business that hasn't provided one — the public page only
-- renders these when the owner set them.
--
-- Generated offline via `prisma migrate diff` (schema→schema, no live DB was
-- contacted). Applied on developer machines only; never `db push` on prod.

-- AlterTable
ALTER TABLE "Website" ADD COLUMN "socialLinks" TEXT;
ALTER TABLE "Website" ADD COLUMN "googleRating" DOUBLE PRECISION;
ALTER TABLE "Website" ADD COLUMN "googleRatingCount" INTEGER;
