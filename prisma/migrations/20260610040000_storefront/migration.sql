-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "slug" TEXT,
ADD COLUMN     "logoUrl" TEXT,
ADD COLUMN     "storeEnabled" BOOLEAN NOT NULL DEFAULT false;

-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_createdById_fkey";

-- AlterTable
ALTER TABLE "Order" ALTER COLUMN "createdById" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Project_slug_key" ON "Project"("slug");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
