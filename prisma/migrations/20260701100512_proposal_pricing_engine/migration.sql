/*
  Warnings:

  - You are about to drop the column `blockId` on the `ProposalService` table. All the data in the column will be lost.
  - Added the required column `total` to the `ProposalLineItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `proposalId` to the `ProposalService` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('FIXED', 'PERCENTAGE');

-- DropForeignKey
ALTER TABLE "ProposalService" DROP CONSTRAINT "ProposalService_blockId_fkey";

-- DropIndex
DROP INDEX "ProposalService_blockId_key";

-- AlterTable
ALTER TABLE "Proposal" ADD COLUMN     "discount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "grandTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "tax" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "ProposalFeature" ADD COLUMN     "packageId" TEXT,
ADD COLUMN     "serviceId" TEXT;

-- AlterTable
ALTER TABLE "ProposalLineItem" ADD COLUMN     "discountType" "DiscountType",
ADD COLUMN     "discountValue" DECIMAL(12,2),
ADD COLUMN     "isCustom" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "packageItemId" TEXT,
ADD COLUMN     "total" DECIMAL(12,2) NOT NULL;

-- AlterTable
ALTER TABLE "ProposalService" DROP COLUMN "blockId",
ADD COLUMN     "packageId" TEXT,
ADD COLUMN     "proposalId" TEXT NOT NULL,
ADD COLUMN     "serviceId" TEXT;

-- AlterTable
ALTER TABLE "ServicePackageItem" ADD COLUMN     "isOptional" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "ProposalService_proposalId_idx" ON "ProposalService"("proposalId");

-- AddForeignKey
ALTER TABLE "ProposalService" ADD CONSTRAINT "ProposalService_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProposalService" ADD CONSTRAINT "ProposalService_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProposalService" ADD CONSTRAINT "ProposalService_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "ServicePackage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
