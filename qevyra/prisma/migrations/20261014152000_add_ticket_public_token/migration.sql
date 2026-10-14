-- High-entropy public tracking secret embedded in customer QR links.
-- `trackingCode` stays the human-friendly reference (e.g. GAR-0001) but is
-- guessable/sequential, so it must no longer authenticate the public page.
-- Add the column, backfill existing rows with an opaque random value, then
-- enforce NOT NULL + uniqueness (Prisma cannot generate this backfill).

-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN "publicToken" TEXT;

-- Backfill
UPDATE "Ticket"
SET "publicToken" = md5(random()::text || clock_timestamp()::text || "id")
WHERE "publicToken" IS NULL;

-- AlterTable
ALTER TABLE "Ticket" ALTER COLUMN "publicToken" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_publicToken_key" ON "Ticket"("publicToken");
