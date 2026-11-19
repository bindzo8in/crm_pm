-- CreateEnum
CREATE TYPE "BillableItemType" AS ENUM ('GOODS', 'SERVICE');

-- AlterTable
ALTER TABLE "InvoiceLineItem" ADD COLUMN     "itemType" "BillableItemType" NOT NULL DEFAULT 'SERVICE';

-- AlterTable
ALTER TABLE "ProposalLineItem" ADD COLUMN     "itemType" "BillableItemType" NOT NULL DEFAULT 'SERVICE';
