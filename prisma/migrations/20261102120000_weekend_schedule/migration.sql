ALTER TABLE "attendance_settings"
ADD COLUMN "weekend_days" INTEGER[] NOT NULL DEFAULT ARRAY[0]::INTEGER[];

ALTER TABLE "leave_request"
ADD COLUMN "weekendCount" INTEGER NOT NULL DEFAULT 0;

UPDATE "leave_request"
SET "weekendCount" = "sundayCount";
