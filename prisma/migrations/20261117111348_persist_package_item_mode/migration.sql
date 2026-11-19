-- DropIndex
DROP INDEX "InvoiceLineItem_productId_idx";

-- DropIndex
DROP INDEX "ProposalLineItem_productId_idx";

-- DropIndex
DROP INDEX "Service_isActive_idx";

-- AlterTable
ALTER TABLE "InvoiceLineItem" ADD COLUMN     "packageHasItems" BOOLEAN;

-- AlterTable
ALTER TABLE "ProposalService" ADD COLUMN     "hasItems" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "ServicePackage" ADD COLUMN     "hasItems" BOOLEAN NOT NULL DEFAULT true;
