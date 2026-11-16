ALTER TABLE "Customer"
ADD COLUMN "organizationId" TEXT;

ALTER TABLE "Service"
ADD COLUMN "organizationId" TEXT;

DROP INDEX IF EXISTS "Service_slug_key";

ALTER TABLE "Proposal"
ADD COLUMN "organizationId" TEXT;

ALTER TABLE "Invoice"
ADD COLUMN "organizationId" TEXT;

CREATE TABLE "Product" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT,
  "sku" TEXT,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "unit" TEXT NOT NULL DEFAULT 'item',
  "basePrice" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "basePriceUSD" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "taxRate" INTEGER NOT NULL DEFAULT 18,
  "hsnCode" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ProposalLineItem"
ADD COLUMN "productId" TEXT;

ALTER TABLE "InvoiceLineItem"
ADD COLUMN "productId" TEXT;

CREATE UNIQUE INDEX "Service_organizationId_slug_key"
ON "Service"("organizationId", "slug");

CREATE UNIQUE INDEX "Product_organizationId_sku_key"
ON "Product"("organizationId", "sku");

CREATE INDEX "Customer_organizationId_deletedAt_idx"
ON "Customer"("organizationId", "deletedAt");

CREATE INDEX "Service_organizationId_isActive_idx"
ON "Service"("organizationId", "isActive");

CREATE INDEX "Product_organizationId_isActive_deletedAt_idx"
ON "Product"("organizationId", "isActive", "deletedAt");

CREATE INDEX "Proposal_organizationId_status_idx"
ON "Proposal"("organizationId", "status");

CREATE INDEX "Invoice_organizationId_status_deletedAt_idx"
ON "Invoice"("organizationId", "status", "deletedAt");

CREATE INDEX "ProposalLineItem_productId_idx"
ON "ProposalLineItem"("productId");

CREATE INDEX "InvoiceLineItem_productId_idx"
ON "InvoiceLineItem"("productId");

ALTER TABLE "Customer"
ADD CONSTRAINT "Customer_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "organization"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Service"
ADD CONSTRAINT "Service_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "organization"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Product"
ADD CONSTRAINT "Product_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "organization"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Proposal"
ADD CONSTRAINT "Proposal_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "organization"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Invoice"
ADD CONSTRAINT "Invoice_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "organization"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProposalLineItem"
ADD CONSTRAINT "ProposalLineItem_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "Product"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "InvoiceLineItem"
ADD CONSTRAINT "InvoiceLineItem_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "Product"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
