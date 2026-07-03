/*
  Warnings:

  - You are about to drop the `ProposalTermService` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ProposalTermService" DROP CONSTRAINT "ProposalTermService_serviceId_fkey";

-- DropForeignKey
ALTER TABLE "ProposalTermService" DROP CONSTRAINT "ProposalTermService_termId_fkey";

-- AlterTable
ALTER TABLE "PackageFeature" ADD COLUMN     "heading" TEXT;

-- AlterTable
ALTER TABLE "ProposalFeature" ADD COLUMN     "heading" TEXT,
ALTER COLUMN "sortOrder" SET DEFAULT 0;

-- DropTable
DROP TABLE "ProposalTermService";

-- CreateTable
CREATE TABLE "ProposalTermPackage" (
    "termId" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ProposalTermPackage_pkey" PRIMARY KEY ("termId","packageId")
);

-- AddForeignKey
ALTER TABLE "ProposalTermPackage" ADD CONSTRAINT "ProposalTermPackage_termId_fkey" FOREIGN KEY ("termId") REFERENCES "ProposalTerm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProposalTermPackage" ADD CONSTRAINT "ProposalTermPackage_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "ServicePackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
