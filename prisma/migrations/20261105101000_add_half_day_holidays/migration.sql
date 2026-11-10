ALTER TABLE "holiday"
ADD COLUMN "is_half_day" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "leave_request"
ALTER COLUMN "netLeaveDays" TYPE DOUBLE PRECISION,
ALTER COLUMN "holidayCount" TYPE DOUBLE PRECISION;

CREATE TYPE "LeaveHalfDayPeriod" AS ENUM ('MORNING', 'AFTERNOON');

ALTER TABLE "leave_request"
ADD COLUMN "is_half_day" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "half_day_period" "LeaveHalfDayPeriod";
