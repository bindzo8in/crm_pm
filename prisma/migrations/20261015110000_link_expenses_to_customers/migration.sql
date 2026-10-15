ALTER TABLE "Expense"
    ADD COLUMN "customerId" TEXT;

ALTER TABLE "Expense"
    ADD CONSTRAINT "Expense_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Expense_customerId_idx" ON "Expense"("customerId");
