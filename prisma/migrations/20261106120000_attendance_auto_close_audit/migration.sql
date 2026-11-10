ALTER TABLE "attendance_record"
ADD COLUMN "autoClosedAt" TIMESTAMP(3);

UPDATE "attendance_record"
SET "clockOut" = NULL,
    "workMinutes" = 0,
    "overtimeMinutes" = 0,
    "autoClosedAt" = COALESCE("autoClosedAt", "updatedAt")
WHERE "isAutoCheckedOut" = true;
