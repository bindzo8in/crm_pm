-- AlterTable
ALTER TABLE "attendance_record" ADD COLUMN     "breakMinutes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "earlyLeaveMinutes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "isAutoCheckedOut" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lateMinutes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "overtimeMinutes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "regularizationReason" TEXT,
ADD COLUMN     "regularized" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "regularizedBy" TEXT,
ADD COLUMN     "workMinutes" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "attendance_settings" ADD COLUMN     "allowOvernightShift" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "halfDayThresholdMinutes" INTEGER NOT NULL DEFAULT 240,
ADD COLUMN     "maxShiftHoursCap" INTEGER NOT NULL DEFAULT 16;

-- CreateTable
CREATE TABLE "attendance_audit_log" (
    "id" TEXT NOT NULL,
    "attendanceRecordId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "oldValues" TEXT,
    "newValues" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "attendance_audit_log_attendanceRecordId_idx" ON "attendance_audit_log"("attendanceRecordId");

-- CreateIndex
CREATE INDEX "attendance_audit_log_userId_idx" ON "attendance_audit_log"("userId");

-- AddForeignKey
ALTER TABLE "attendance_audit_log" ADD CONSTRAINT "attendance_audit_log_attendanceRecordId_fkey" FOREIGN KEY ("attendanceRecordId") REFERENCES "attendance_record"("id") ON DELETE CASCADE ON UPDATE CASCADE;
