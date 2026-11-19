ALTER TABLE "user"
ADD COLUMN "attendance_clock_in_alarm_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "attendance_clock_out_alarm_enabled" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "attendance_schedule_reminder" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "type" TEXT NOT NULL,
    "push_sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "attendance_schedule_reminder_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "attendance_schedule_reminder_user_id_date_type_key"
ON "attendance_schedule_reminder"("user_id", "date", "type");

CREATE INDEX "attendance_schedule_reminder_date_type_idx"
ON "attendance_schedule_reminder"("date", "type");

ALTER TABLE "attendance_schedule_reminder"
ADD CONSTRAINT "attendance_schedule_reminder_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
