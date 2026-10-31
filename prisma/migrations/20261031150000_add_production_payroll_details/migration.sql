-- CreateEnum
CREATE TYPE "EmploymentType" AS ENUM ('PERMANENT', 'CONTRACT', 'PROBATION', 'INTERN');
CREATE TYPE "BankAccountType" AS ENUM ('SAVINGS', 'CURRENT');
CREATE TYPE "TaxRegime" AS ENUM ('OLD', 'NEW');

-- AlterTable
ALTER TABLE "user"
ADD COLUMN "dateOfJoining" TIMESTAMP(3),
ADD COLUMN "employmentType" "EmploymentType",
ADD COLUMN "annualCtc" DECIMAL(14,2),
ADD COLUMN "bankIfsc" TEXT,
ADD COLUMN "bankAccountType" "BankAccountType",
ADD COLUMN "aadhaarNo" TEXT,
ADD COLUMN "esiNo" TEXT,
ADD COLUMN "pfEligible" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "esiEligible" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "taxRegime" "TaxRegime" NOT NULL DEFAULT 'NEW',
ADD COLUMN "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'BANK_TRANSFER';
