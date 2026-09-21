-- CreateEnum
CREATE TYPE "TrackTicketStatus" AS ENUM ('RECEIVED', 'INSPECTING', 'IN_PROGRESS', 'QUALITY_CHECK', 'READY', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TrackServiceType" AS ENUM ('GARAGE', 'TAILOR', 'ELECTRONICS_REPAIR', 'DRY_CLEAN', 'OTHER');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'NEW_TRACK_TICKET';

-- DropIndex
DROP INDEX "Restaurant_starNumber_key";

-- CreateTable
CREATE TABLE "TrackTicket" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "ticketCode" TEXT NOT NULL,
    "serviceType" "TrackServiceType" NOT NULL DEFAULT 'OTHER',
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT,
    "itemDescription" TEXT NOT NULL,
    "internalNote" TEXT,
    "estimatedPrice" DECIMAL(10,2),
    "finalPrice" DECIMAL(10,2),
    "priceNote" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'Rs.',
    "status" "TrackTicketStatus" NOT NULL DEFAULT 'RECEIVED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "readyAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),

    CONSTRAINT "TrackTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrackTicketEvent" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "fromStatus" "TrackTicketStatus",
    "toStatus" "TrackTicketStatus" NOT NULL,
    "note" TEXT,
    "actorNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrackTicketEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TrackTicket_ticketCode_key" ON "TrackTicket"("ticketCode");

-- CreateIndex
CREATE INDEX "TrackTicket_restaurantId_idx" ON "TrackTicket"("restaurantId");

-- CreateIndex
CREATE INDEX "TrackTicket_restaurantId_status_idx" ON "TrackTicket"("restaurantId", "status");

-- CreateIndex
CREATE INDEX "TrackTicket_ticketCode_idx" ON "TrackTicket"("ticketCode");

-- CreateIndex
CREATE INDEX "TrackTicketEvent_ticketId_idx" ON "TrackTicketEvent"("ticketId");

-- AddForeignKey
ALTER TABLE "TrackTicket" ADD CONSTRAINT "TrackTicket_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackTicketEvent" ADD CONSTRAINT "TrackTicketEvent_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "TrackTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
