-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "iecCode" TEXT,
ADD COLUMN     "lutNumber" TEXT;

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "taxId" TEXT;

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "exchangeRate" DECIMAL(10,4) DEFAULT 83.50,
ADD COLUMN     "placeOfSupply" TEXT;

-- AlterTable
ALTER TABLE "InvoiceLineItem" ADD COLUMN     "sacCode" TEXT DEFAULT '9983';

-- AlterTable
ALTER TABLE "Proposal" ADD COLUMN     "exchangeRate" DECIMAL(10,4) DEFAULT 83.50,
ADD COLUMN     "placeOfSupply" TEXT;

-- AlterTable
ALTER TABLE "ProposalLineItem" ADD COLUMN     "sacCode" TEXT DEFAULT '9983';
