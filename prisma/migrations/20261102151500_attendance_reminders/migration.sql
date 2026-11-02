ALTER TABLE "attendance_settings"
ADD COLUMN "attendance_reminder_time" TEXT NOT NULL DEFAULT '08:30';

CREATE TABLE "web_push_subscription" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "web_push_subscription_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "attendance_reminder" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "push_sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "attendance_reminder_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "web_push_subscription_endpoint_key"
ON "web_push_subscription"("endpoint");

CREATE INDEX "web_push_subscription_user_id_idx"
ON "web_push_subscription"("user_id");

CREATE UNIQUE INDEX "attendance_reminder_user_id_date_key"
ON "attendance_reminder"("user_id", "date");

ALTER TABLE "web_push_subscription"
ADD CONSTRAINT "web_push_subscription_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "attendance_reminder"
ADD CONSTRAINT "attendance_reminder_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
