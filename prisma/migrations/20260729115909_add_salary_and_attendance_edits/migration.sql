-- CreateEnum
CREATE TYPE "SalarySlipStatus" AS ENUM ('DRAFT', 'GENERATED', 'PAID');

-- AlterTable
ALTER TABLE "attendance_audit_log" ADD COLUMN     "editorId" TEXT,
ADD COLUMN     "editorRole" TEXT;

-- AlterTable
ALTER TABLE "attendance_record" ADD COLUMN     "isManuallyEdited" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "salary_structure" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "basicSalary" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "hra" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "conveyance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "medical" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "specialAllowance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "providentFund" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "professionalTax" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "tds" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "customComponents" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "salary_structure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "salary_slip" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "status" "SalarySlipStatus" NOT NULL DEFAULT 'DRAFT',
    "totalDays" INTEGER NOT NULL,
    "paidDays" INTEGER NOT NULL,
    "presentDays" INTEGER NOT NULL,
    "absentDays" INTEGER NOT NULL,
    "leaveDays" INTEGER NOT NULL,
    "halfDays" INTEGER NOT NULL,
    "basicSalary" DECIMAL(12,2) NOT NULL,
    "hra" DECIMAL(12,2) NOT NULL,
    "conveyance" DECIMAL(12,2) NOT NULL,
    "medical" DECIMAL(12,2) NOT NULL,
    "specialAllowance" DECIMAL(12,2) NOT NULL,
    "providentFund" DECIMAL(12,2) NOT NULL,
    "professionalTax" DECIMAL(12,2) NOT NULL,
    "tds" DECIMAL(12,2) NOT NULL,
    "absentDeduction" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "halfDayDeduction" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "customComponents" JSONB,
    "totalEarnings" DECIMAL(12,2) NOT NULL,
    "totalDeductions" DECIMAL(12,2) NOT NULL,
    "netSalary" DECIMAL(12,2) NOT NULL,
    "paymentDate" TIMESTAMP(3),
    "paymentMethod" TEXT,
    "referenceId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "salary_slip_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "salary_structure_userId_key" ON "salary_structure"("userId");

-- CreateIndex
CREATE INDEX "salary_slip_userId_idx" ON "salary_slip"("userId");

-- CreateIndex
CREATE INDEX "salary_slip_month_year_idx" ON "salary_slip"("month", "year");

-- CreateIndex
CREATE INDEX "salary_slip_status_idx" ON "salary_slip"("status");

-- CreateIndex
CREATE UNIQUE INDEX "salary_slip_userId_month_year_key" ON "salary_slip"("userId", "month", "year");

-- AddForeignKey
ALTER TABLE "salary_structure" ADD CONSTRAINT "salary_structure_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salary_slip" ADD CONSTRAINT "salary_slip_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
