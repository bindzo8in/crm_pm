-- AlterTable
ALTER TABLE "ServicePackage" ADD COLUMN     "totalPriceUSD" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "ServicePackageItem" ADD COLUMN     "unitPriceUSD" DECIMAL(12,2) NOT NULL DEFAULT 0;
