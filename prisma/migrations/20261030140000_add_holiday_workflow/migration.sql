CREATE TYPE "HolidayCategory" AS ENUM (
    'MANDATORY_GAZETTED',
    'RESTRICTED_OPTIONAL',
    'COMPANY_SPECIAL'
);

ALTER TABLE "holiday"
ADD COLUMN "event_id" TEXT,
ADD COLUMN "category" "HolidayCategory" NOT NULL DEFAULT 'MANDATORY_GAZETTED',
ADD COLUMN "departments" "Department"[] NOT NULL DEFAULT ARRAY[]::"Department"[],
ADD COLUMN "notify_staff" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "holiday_event_id_idx" ON "holiday"("event_id");

CREATE TABLE "notification" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'GENERAL',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "href" TEXT NOT NULL,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "notification_user_id_read_at_created_at_idx"
ON "notification"("user_id", "read_at", "created_at");

ALTER TABLE "notification"
ADD CONSTRAINT "notification_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "user"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
