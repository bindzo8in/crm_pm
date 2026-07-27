-- AlterTable
ALTER TABLE "attendance_record" ADD COLUMN     "department" "Department";

-- CreateIndex
CREATE INDEX "attendance_record_department_idx" ON "attendance_record"("department");
