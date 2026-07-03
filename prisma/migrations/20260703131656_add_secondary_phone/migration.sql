/*
  Warnings:

  - You are about to drop the `Quotation` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `QuotationActivity` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `QuotationLineItem` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `QuotationService` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TermsTemplate` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Quotation" DROP CONSTRAINT "Quotation_customerId_fkey";

-- DropForeignKey
ALTER TABLE "Quotation" DROP CONSTRAINT "Quotation_preparedById_fkey";

-- DropForeignKey
ALTER TABLE "QuotationActivity" DROP CONSTRAINT "QuotationActivity_quotationId_fkey";

-- DropForeignKey
ALTER TABLE "QuotationActivity" DROP CONSTRAINT "QuotationActivity_userId_fkey";

-- DropForeignKey
ALTER TABLE "QuotationLineItem" DROP CONSTRAINT "QuotationLineItem_quotationServiceId_fkey";

-- DropForeignKey
ALTER TABLE "QuotationService" DROP CONSTRAINT "QuotationService_packageId_fkey";

-- DropForeignKey
ALTER TABLE "QuotationService" DROP CONSTRAINT "QuotationService_quotationId_fkey";

-- DropForeignKey
ALTER TABLE "QuotationService" DROP CONSTRAINT "QuotationService_serviceId_fkey";

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "secondaryPhone" TEXT;

-- DropTable
DROP TABLE "Quotation";

-- DropTable
DROP TABLE "QuotationActivity";

-- DropTable
DROP TABLE "QuotationLineItem";

-- DropTable
DROP TABLE "QuotationService";

-- DropTable
DROP TABLE "TermsTemplate";

-- DropEnum
DROP TYPE "QuotationActivityType";

-- DropEnum
DROP TYPE "QuotationStatus";
