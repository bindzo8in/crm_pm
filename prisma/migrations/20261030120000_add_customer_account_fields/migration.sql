ALTER TABLE "Customer"
    ADD COLUMN "primaryContactSalutation" TEXT,
    ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'INR',
    ADD COLUMN "customerLanguage" TEXT NOT NULL DEFAULT 'English',
    ADD COLUMN "gstTreatment" TEXT,
    ADD COLUMN "placeOfSupply" TEXT,
    ADD COLUMN "taxPreference" TEXT NOT NULL DEFAULT 'TAXABLE',
    ADD COLUMN "paymentTerms" TEXT NOT NULL DEFAULT 'DUE_ON_RECEIPT',
    ADD COLUMN "portalEnabled" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "documents" JSONB;
