UPDATE "ProposalLineItem"
SET "itemType" = 'GOODS'
WHERE "productId" IS NOT NULL;

UPDATE "InvoiceLineItem"
SET "itemType" = 'GOODS'
WHERE "productId" IS NOT NULL;
