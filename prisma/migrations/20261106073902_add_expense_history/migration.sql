-- CreateTable
CREATE TABLE "ExpenseHistory" (
    "id" TEXT NOT NULL,
    "expenseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExpenseHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExpenseHistory_expenseId_idx" ON "ExpenseHistory"("expenseId");

-- CreateIndex
CREATE INDEX "ExpenseHistory_createdAt_idx" ON "ExpenseHistory"("createdAt");

-- CreateIndex
CREATE INDEX "ExpenseCategory_isActive_idx" ON "ExpenseCategory"("isActive");

-- RenameForeignKey
ALTER TABLE "salary_slip" RENAME CONSTRAINT "salary_slip_approved_by_id_fkey" TO "salary_slip_approvedById_fkey";

-- RenameForeignKey
ALTER TABLE "salary_slip" RENAME CONSTRAINT "salary_slip_email_sent_by_id_fkey" TO "salary_slip_emailSentById_fkey";

-- AddForeignKey
ALTER TABLE "ExpenseHistory" ADD CONSTRAINT "ExpenseHistory_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "Expense"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseHistory" ADD CONSTRAINT "ExpenseHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "ProjectTaskDependency_taskId_dependsOnTaskId_key" RENAME TO "ProjectTaskDependency_taskId_dependsOnTaskId_relationType_key";

