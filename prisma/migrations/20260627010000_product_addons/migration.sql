-- Add per-unit product add-ons and store their order-line snapshot.
CREATE TABLE "ProductAddon" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "position" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ProductAddon_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProductAddon_productId_idx" ON "ProductAddon"("productId");

ALTER TABLE "ProductAddon"
ADD CONSTRAINT "ProductAddon_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OrderItem"
ADD COLUMN "addonTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "addons" JSONB;
