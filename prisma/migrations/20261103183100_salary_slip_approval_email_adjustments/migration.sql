CREATE TYPE "SalarySlipAdjustmentType" AS ENUM ('EARNING', 'DEDUCTION');

ALTER TABLE "salary_slip"
ADD COLUMN "approvedAt" TIMESTAMP(3),
ADD COLUMN "approvedById" TEXT,
ADD COLUMN "emailSentAt" TIMESTAMP(3),
ADD COLUMN "emailSentById" TEXT,
ADD COLUMN "scheduled_generation" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "salary_slip_adjustment" (
    "id" TEXT NOT NULL,
    "salary_slip_id" TEXT NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "type" "SalarySlipAdjustmentType" NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removed_at" TIMESTAMP(3),
    "removed_by_id" TEXT,

    CONSTRAINT "salary_slip_adjustment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "salary_slip_adjustment_salary_slip_id_idx"
ON "salary_slip_adjustment"("salary_slip_id");

ALTER TABLE "salary_slip"
ADD CONSTRAINT "salary_slip_approved_by_id_fkey"
FOREIGN KEY ("approvedById") REFERENCES "user"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "salary_slip"
ADD CONSTRAINT "salary_slip_email_sent_by_id_fkey"
FOREIGN KEY ("emailSentById") REFERENCES "user"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "salary_slip_adjustment"
ADD CONSTRAINT "salary_slip_adjustment_salary_slip_id_fkey"
FOREIGN KEY ("salary_slip_id") REFERENCES "salary_slip"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "salary_slip_adjustment"
ADD CONSTRAINT "salary_slip_adjustment_created_by_id_fkey"
FOREIGN KEY ("created_by_id") REFERENCES "user"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "salary_slip_adjustment"
ADD CONSTRAINT "salary_slip_adjustment_removed_by_id_fkey"
FOREIGN KEY ("removed_by_id") REFERENCES "user"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
