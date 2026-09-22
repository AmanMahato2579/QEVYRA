-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('WEBSITE', 'MENU', 'ORDER', 'TRACK', 'TRACK_PRO');

-- CreateTable
CREATE TABLE "Product" (
    "id" "ProductType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "featureKeys" TEXT NOT NULL DEFAULT '[]',
    "limitKeys" TEXT NOT NULL DEFAULT '{}',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessProduct" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "productId" "ProductType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessProduct_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Product_isVisible_idx" ON "Product"("isVisible");

-- CreateIndex
CREATE INDEX "BusinessProduct_businessId_idx" ON "BusinessProduct"("businessId");

-- CreateIndex
CREATE INDEX "BusinessProduct_productId_idx" ON "BusinessProduct"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessProduct_businessId_productId_key" ON "BusinessProduct"("businessId", "productId");

-- AddForeignKey
ALTER TABLE "BusinessProduct" ADD CONSTRAINT "BusinessProduct_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessProduct" ADD CONSTRAINT "BusinessProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ─── Product catalog (seed) ──────────────────────────────────────────────
-- Functional products granted to a business. featureKeys is the FULL flattened
-- set the product unlocks (composition already folded in); limitKeys is the
-- default limit ceiled on top of any earlier products. Mirrors src/lib/plan-catalog.ts.

INSERT INTO "Product" ("id", "name", "description", "featureKeys", "limitKeys", "sortOrder", "isVisible", "isActive", "createdAt", "updatedAt") VALUES
('WEBSITE', 'Website', 'A modern public website for your business.', '["business_website"]', '{}', 1, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('MENU', 'Menu', 'Digital menu with QR tables for dine-in menus.', '["restaurant_profile","digital_menu","menu_management","qr_tables","business_website"]', '{"qrTables":10}', 2, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('ORDER', 'Order', 'QR ordering, order management and the kitchen workflow.', '["restaurant_profile","digital_menu","menu_management","qr_tables","ordering","table_ordering","order_management","kitchen_workflow","order_history","bookings","business_website"]', '{"qrTables":20}', 3, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('TRACK', 'Track', 'Customer ticket tracking for service businesses.', '["business_website","business_track"]', '{"workflows":5}', 4, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('TRACK_PRO', 'Track Pro', 'Track with more workflows and automation.', '["business_website","business_track"]', '{"workflows":20}', 5, false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- ─── BusinessProduct backfill ────────────────────────────────────────────
-- Give every existing business the product set matching its previous plan/type
-- so the product-driven access path is authoritative for current tenants:
--   STAR/founding  → all products
--   SILVER         → Website + Menu + Order
--   track kinds    → Website + Track
--   default        → Website + Menu
INSERT INTO "BusinessProduct" ("id", "businessId", "productId", "isActive", "createdAt", "updatedAt")
SELECT b.id || ':' || p,
       b.id,
       p::"ProductType",
       true,
       CURRENT_TIMESTAMP,
       CURRENT_TIMESTAMP
FROM "Business" b
CROSS JOIN unnest(
  CASE
    WHEN b."starNumber" IS NOT NULL OR b.plan = 'STAR'
      THEN ARRAY['WEBSITE','MENU','ORDER','TRACK','TRACK_PRO']::text[]
    WHEN b.plan = 'SILVER'
      THEN ARRAY['WEBSITE','MENU','ORDER']::text[]
    WHEN b.type IN ('TAILOR','DRY_CLEANING','GARAGE','CLEANING','REPAIR','SERVICE','RETAIL')
      THEN ARRAY['WEBSITE','TRACK']::text[]
    ELSE ARRAY['WEBSITE','MENU']::text[]
  END
) AS p;
