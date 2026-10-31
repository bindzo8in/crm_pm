CREATE TYPE "EmploymentStatus" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE "EmploymentStatusAction" AS ENUM ('DEACTIVATED', 'REACTIVATED');

ALTER TABLE "user"
ADD COLUMN "employment_status" "EmploymentStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN "employment_ended_at" TIMESTAMP(3);

CREATE TABLE "employee_status_history" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "action" "EmploymentStatusAction" NOT NULL,
    "effective_at" TIMESTAMP(3) NOT NULL,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT NOT NULL,
    "changed_by_id" TEXT,
    "reassigned_to_id" TEXT,
    "reassigned_customer_count" INTEGER NOT NULL DEFAULT 0,
    "reassigned_project_count" INTEGER NOT NULL DEFAULT 0,
    "reassigned_task_count" INTEGER NOT NULL DEFAULT 0,
    "reassigned_member_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "employee_status_history_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "employee_status_history_user_id_effective_at_idx"
ON "employee_status_history"("user_id", "effective_at");

CREATE INDEX "employee_status_history_changed_by_id_changed_at_idx"
ON "employee_status_history"("changed_by_id", "changed_at");

ALTER TABLE "employee_status_history"
ADD CONSTRAINT "employee_status_history_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "user"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "employee_status_history"
ADD CONSTRAINT "employee_status_history_changed_by_id_fkey"
FOREIGN KEY ("changed_by_id") REFERENCES "user"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "employee_status_history"
ADD CONSTRAINT "employee_status_history_reassigned_to_id_fkey"
FOREIGN KEY ("reassigned_to_id") REFERENCES "user"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
