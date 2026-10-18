-- CreateEnum
CREATE TYPE "SiteType" AS ENUM ('GENERAL', 'TRACKING', 'MENU');

-- CreateTable
CREATE TABLE "Site" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" "SiteType" NOT NULL,
    "name" TEXT NOT NULL,
    "shortDescription" TEXT,
    "aboutText" TEXT,
    "storyText" TEXT,
    "logoUrl" TEXT,
    "heroImageUrl" TEXT,
    "primaryColor" TEXT,
    "phone" TEXT,
    "whatsapp" TEXT,
    "addressText" TEXT,
    "mapUrl" TEXT,
    "openingHours" TEXT,
    "googleReviewUrl" TEXT,
    "socialLinks" JSONB,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "enableItems" BOOLEAN NOT NULL DEFAULT false,
    "enableTrackOrder" BOOLEAN NOT NULL DEFAULT false,
    "enableAds" BOOLEAN NOT NULL DEFAULT false,
    "enableBooking" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Site_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteHighlight" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SiteHighlight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteItem" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "priceText" TEXT,
    "imageUrl" TEXT,
    "category" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "SiteItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteAd" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "linkUrl" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteAd_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Site_businessId_key" ON "Site"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "Site_slug_key" ON "Site"("slug");

-- CreateIndex
CREATE INDEX "Site_slug_idx" ON "Site"("slug");

-- CreateIndex
CREATE INDEX "Site_businessId_idx" ON "Site"("businessId");

-- CreateIndex
CREATE INDEX "SiteHighlight_siteId_sortOrder_idx" ON "SiteHighlight"("siteId", "sortOrder");

-- CreateIndex
CREATE INDEX "SiteHighlight_businessId_idx" ON "SiteHighlight"("businessId");

-- CreateIndex
CREATE INDEX "SiteItem_siteId_sortOrder_idx" ON "SiteItem"("siteId", "sortOrder");

-- CreateIndex
CREATE INDEX "SiteItem_businessId_idx" ON "SiteItem"("businessId");

-- CreateIndex
CREATE INDEX "SiteAd_isActive_sortOrder_idx" ON "SiteAd"("isActive", "sortOrder");

-- AddForeignKey
ALTER TABLE "Site" ADD CONSTRAINT "Site_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteHighlight" ADD CONSTRAINT "SiteHighlight_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteHighlight" ADD CONSTRAINT "SiteHighlight_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteItem" ADD CONSTRAINT "SiteItem_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteItem" ADD CONSTRAINT "SiteItem_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
