ALTER TABLE "Expense"
    ADD COLUMN "expenseType" TEXT NOT NULL DEFAULT 'SERVICES',
    ADD COLUMN "sacCode" TEXT,
    ADD COLUMN "gstTreatment" TEXT,
    ADD COLUMN "sourceOfSupply" TEXT,
    ADD COLUMN "destinationOfSupply" TEXT,
    ADD COLUMN "reverseCharge" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "taxRate" INTEGER,
    ADD COLUMN "taxInclusive" BOOLEAN NOT NULL DEFAULT false;
