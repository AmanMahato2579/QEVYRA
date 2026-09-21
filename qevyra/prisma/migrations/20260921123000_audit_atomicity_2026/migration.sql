-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "clientRequestId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "tokenVersion" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "WorkflowSequence" (
    "workflowId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "lastTicketNumber" INTEGER NOT NULL DEFAULT 1000,

    CONSTRAINT "WorkflowSequence_pkey" PRIMARY KEY ("workflowId")
);

-- CreateIndex
CREATE INDEX "WorkflowSequence_businessId_idx" ON "WorkflowSequence"("businessId");

-- CreateIndex
CREATE INDEX "Booking_serviceId_bookingDate_status_idx" ON "Booking"("serviceId", "bookingDate", "status");

-- CreateIndex
CREATE INDEX "Order_restaurantId_createdAt_idx" ON "Order"("restaurantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Order_tableSessionId_clientRequestId_key" ON "Order"("tableSessionId", "clientRequestId");

-- CreateIndex
CREATE INDEX "OrderItem_menuItemId_idx" ON "OrderItem"("menuItemId");

-- CreateIndex
CREATE INDEX "TableSession_restaurantId_status_idx" ON "TableSession"("restaurantId", "status");

-- CreateIndex
CREATE INDEX "TableSession_status_startedAt_idx" ON "TableSession"("status", "startedAt");

-- CreateIndex
CREATE INDEX "Ticket_businessId_createdAt_idx" ON "Ticket"("businessId", "createdAt");

-- CreateIndex
CREATE INDEX "Ticket_businessId_status_idx" ON "Ticket"("businessId", "status");

-- CreateIndex
CREATE INDEX "Ticket_status_statusChangedAt_idx" ON "Ticket"("status", "statusChangedAt");

-- CreateIndex
CREATE INDEX "Ticket_createdAt_idx" ON "Ticket"("createdAt");

-- AddForeignKey
ALTER TABLE "WorkflowSequence" ADD CONSTRAINT "WorkflowSequence_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;