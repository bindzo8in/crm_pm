ALTER TABLE "attendance_reminder"
  ADD COLUMN "organizationId" TEXT;

ALTER TABLE "attendance_schedule_reminder"
  ADD COLUMN "organizationId" TEXT;

DROP INDEX IF EXISTS "attendance_reminder_user_id_date_key";

DROP INDEX IF EXISTS "attendance_schedule_reminder_user_id_date_type_key";

CREATE UNIQUE INDEX "attendance_reminder_organizationId_user_id_date_key"
  ON "attendance_reminder"("organizationId", "user_id", "date");
CREATE UNIQUE INDEX "attendance_reminder_user_id_date_legacy_key"
  ON "attendance_reminder"("user_id", "date")
  WHERE "organizationId" IS NULL;
CREATE INDEX "attendance_reminder_organizationId_date_idx"
  ON "attendance_reminder"("organizationId", "date");

CREATE UNIQUE INDEX "attendance_schedule_reminder_organizationId_user_id_date_type_key"
  ON "attendance_schedule_reminder"("organizationId", "user_id", "date", "type");
CREATE UNIQUE INDEX "attendance_schedule_reminder_user_id_date_type_legacy_key"
  ON "attendance_schedule_reminder"("user_id", "date", "type")
  WHERE "organizationId" IS NULL;
CREATE INDEX "attendance_schedule_reminder_organizationId_date_type_idx"
  ON "attendance_schedule_reminder"("organizationId", "date", "type");

ALTER TABLE "attendance_reminder"
  ADD CONSTRAINT "attendance_reminder_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "attendance_schedule_reminder"
  ADD CONSTRAINT "attendance_schedule_reminder_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
