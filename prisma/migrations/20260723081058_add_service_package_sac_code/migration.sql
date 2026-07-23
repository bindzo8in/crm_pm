-- AlterTable
ALTER TABLE "ServicePackage" ADD COLUMN     "sacCode" TEXT DEFAULT '9983';

-- AlterTable
ALTER TABLE "ServicePackageItem" ADD COLUMN     "sacCode" TEXT DEFAULT '9983';
