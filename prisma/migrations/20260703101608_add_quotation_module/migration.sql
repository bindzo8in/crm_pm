-- CreateEnum
CREATE TYPE "QuotationStatus" AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "QuotationActivityType" AS ENUM ('CREATED', 'UPDATED', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'DUPLICATED');

-- CreateTable
CREATE TABLE "TermsTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "contentJson" JSONB NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TermsTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quotation" (
    "id" TEXT NOT NULL,
    "quotationNumber" SERIAL NOT NULL,
    "customerId" TEXT NOT NULL,
    "preparedById" TEXT NOT NULL,
    "customerDisplayName" TEXT NOT NULL,
    "customerCompanyName" TEXT,
    "preparedByName" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "QuotationStatus" NOT NULL DEFAULT 'DRAFT',
    "validUntil" TIMESTAMP(3),
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "content" JSONB,
    "termsContent" JSONB,
    "notes" TEXT,
    "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "discount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "tax" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "roundOff" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "grandTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quotation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuotationService" (
    "id" TEXT NOT NULL,
    "quotationId" TEXT NOT NULL,
    "serviceId" TEXT,
    "serviceName" TEXT NOT NULL,
    "packageId" TEXT,
    "packageName" TEXT,
    "description" TEXT,
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "QuotationService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuotationLineItem" (
    "id" TEXT NOT NULL,
    "quotationServiceId" TEXT NOT NULL,
    "packageItemId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "quantity" INTEGER NOT NULL,
    "unit" TEXT NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,
    "billingCycle" "BillingCycle" NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "isCustom" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "discountType" "DiscountType",
    "discountValue" DECIMAL(12,2),
    "taxRate" INTEGER NOT NULL DEFAULT 18,

    CONSTRAINT "QuotationLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuotationActivity" (
    "id" TEXT NOT NULL,
    "quotationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" "QuotationActivityType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuotationActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Quotation_quotationNumber_key" ON "Quotation"("quotationNumber");

-- CreateIndex
CREATE INDEX "Quotation_customerId_idx" ON "Quotation"("customerId");

-- CreateIndex
CREATE INDEX "Quotation_status_idx" ON "Quotation"("status");

-- CreateIndex
CREATE INDEX "QuotationService_quotationId_idx" ON "QuotationService"("quotationId");

-- CreateIndex
CREATE INDEX "QuotationLineItem_quotationServiceId_idx" ON "QuotationLineItem"("quotationServiceId");

-- CreateIndex
CREATE INDEX "QuotationActivity_quotationId_idx" ON "QuotationActivity"("quotationId");

-- AddForeignKey
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_preparedById_fkey" FOREIGN KEY ("preparedById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotationService" ADD CONSTRAINT "QuotationService_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "Quotation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotationService" ADD CONSTRAINT "QuotationService_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotationService" ADD CONSTRAINT "QuotationService_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "ServicePackage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotationLineItem" ADD CONSTRAINT "QuotationLineItem_quotationServiceId_fkey" FOREIGN KEY ("quotationServiceId") REFERENCES "QuotationService"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotationActivity" ADD CONSTRAINT "QuotationActivity_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "Quotation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotationActivity" ADD CONSTRAINT "QuotationActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
