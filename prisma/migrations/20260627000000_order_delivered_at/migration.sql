-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "deliveredAt" TIMESTAMP(3);

-- Backfill: treat existing delivered orders as delivered at their last update,
-- so the driver's 12h grace window has a sensible starting point.
UPDATE "Order" SET "deliveredAt" = "updatedAt" WHERE "status" = 'DELIVERED';
