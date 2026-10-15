CREATE TYPE "FinancialAccountType" AS ENUM ('BANK', 'CASH');
CREATE TYPE "ExpenseStatus" AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED', 'REVERSED');

CREATE TABLE "FinancialAccount" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "FinancialAccountType" NOT NULL DEFAULT 'BANK',
    "companyBankAccountId" TEXT,
    "openingBalance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "openingBalanceDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FinancialAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ExpenseCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ExpenseCategory_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ExpenseCategory_name_key" UNIQUE ("name")
);

CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "transactionNumber" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "expenseDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'BANK_TRANSFER',
    "status" "ExpenseStatus" NOT NULL DEFAULT 'PENDING',
    "referenceNumber" TEXT,
    "notes" TEXT,
    "receiptUrl" TEXT,
    "categoryId" TEXT NOT NULL,
    "financialAccountId" TEXT NOT NULL,
    "vendorName" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Expense_transactionNumber_key" UNIQUE ("transactionNumber")
);

ALTER TABLE "FinancialAccount"
    ADD CONSTRAINT "FinancialAccount_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FinancialAccount"
    ADD CONSTRAINT "FinancialAccount_companyBankAccountId_fkey"
    FOREIGN KEY ("companyBankAccountId") REFERENCES "CompanyBankAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Expense"
    ADD CONSTRAINT "Expense_categoryId_fkey"
    FOREIGN KEY ("categoryId") REFERENCES "ExpenseCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Expense"
    ADD CONSTRAINT "Expense_financialAccountId_fkey"
    FOREIGN KEY ("financialAccountId") REFERENCES "FinancialAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Expense"
    ADD CONSTRAINT "Expense_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "InvoicePayment"
    ADD COLUMN IF NOT EXISTS "financialAccountId" TEXT,
    ADD CONSTRAINT "InvoicePayment_financialAccountId_fkey"
    FOREIGN KEY ("financialAccountId") REFERENCES "FinancialAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "FinancialAccount_companyId_isActive_idx"
    ON "FinancialAccount"("companyId", "isActive");

CREATE UNIQUE INDEX "FinancialAccount_companyId_name_key"
    ON "FinancialAccount"("companyId", "name");

CREATE UNIQUE INDEX "FinancialAccount_companyBankAccountId_key"
    ON "FinancialAccount"("companyBankAccountId");

CREATE INDEX "Expense_expenseDate_idx"
    ON "Expense"("expenseDate");

CREATE INDEX "Expense_status_idx"
    ON "Expense"("status");

CREATE INDEX "Expense_categoryId_idx"
    ON "Expense"("categoryId");

CREATE INDEX "Expense_financialAccountId_idx"
    ON "Expense"("financialAccountId");

CREATE INDEX "Expense_createdById_idx"
    ON "Expense"("createdById");

CREATE INDEX "Expense_deletedAt_idx"
    ON "Expense"("deletedAt");

CREATE INDEX "InvoicePayment_financialAccountId_idx"
    ON "InvoicePayment"("financialAccountId");

CREATE INDEX "InvoicePayment_paymentDate_idx"
    ON "InvoicePayment"("paymentDate");
