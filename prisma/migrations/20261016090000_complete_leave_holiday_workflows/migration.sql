ALTER TABLE "leave_request"
ADD COLUMN IF NOT EXISTS "monthlyDayBreakdown" JSONB NOT NULL DEFAULT '{}'::jsonb;

WITH monthly_workdays AS (
    SELECT
        leave.id,
        date_trunc('month', days.day)::date AS month_start,
        COUNT(*) FILTER (
            WHERE EXTRACT(ISODOW FROM days.day) <> 7
              AND NOT EXISTS (
                  SELECT 1
                  FROM "holiday" holiday
                  WHERE holiday.date = days.day::date
              )
        )::integer AS workday_count,
        leave."netLeaveDays" AS net_leave_days
    FROM "leave_request" leave
    CROSS JOIN LATERAL generate_series(
        leave."startDate"::timestamp,
        leave."endDate"::timestamp,
        INTERVAL '1 day'
    ) AS days(day)
    WHERE leave.type = 'ANNUAL'
      AND leave.status = 'APPROVED'
      AND leave."netLeaveDays" > 0
    GROUP BY leave.id, month_start, leave."netLeaveDays"
),
weighted_months AS (
    SELECT
        id,
        month_start,
        net_leave_days,
        CASE
            WHEN SUM(workday_count) OVER (PARTITION BY id) = 0
                THEN CASE
                    WHEN month_start = MIN(month_start) OVER (PARTITION BY id) THEN 1
                    ELSE 0
                END
            ELSE workday_count
        END AS month_weight
    FROM monthly_workdays
),
scaled_months AS (
    SELECT
        id,
        month_start,
        net_leave_days,
        (net_leave_days::numeric * month_weight)
            / NULLIF(SUM(month_weight) OVER (PARTITION BY id), 0) AS scaled_days
    FROM weighted_months
),
base_allocations AS (
    SELECT
        id,
        month_start,
        net_leave_days,
        FLOOR(scaled_days)::integer AS base_days,
        scaled_days - FLOOR(scaled_days) AS fractional_days
    FROM scaled_months
),
ranked_allocations AS (
    SELECT
        id,
        month_start,
        base_days,
        ROW_NUMBER() OVER (
            PARTITION BY id
            ORDER BY fractional_days DESC, month_start
        ) AS remainder_rank,
        net_leave_days - SUM(base_days) OVER (PARTITION BY id) AS remainder_days
    FROM base_allocations
),
monthly_allocations AS (
    SELECT
        id,
        month_start,
        base_days + CASE WHEN remainder_rank <= remainder_days THEN 1 ELSE 0 END AS allocated_days
    FROM ranked_allocations
),
monthly_json AS (
    SELECT
        id,
        jsonb_object_agg(to_char(month_start, 'YYYY-MM'), allocated_days)
            FILTER (WHERE allocated_days > 0) AS breakdown
    FROM monthly_allocations
    GROUP BY id
)
UPDATE "leave_request" leave
SET "monthlyDayBreakdown" = COALESCE(monthly_json.breakdown, '{}'::jsonb)
FROM monthly_json
WHERE leave.id = monthly_json.id;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM "holiday"
        GROUP BY date
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION
            'Duplicate holiday dates exist; consolidate them before applying the holiday date uniqueness constraint.';
    END IF;
END
$$;

DROP INDEX IF EXISTS "holiday_date_idx";
CREATE UNIQUE INDEX IF NOT EXISTS "holiday_date_key" ON "holiday"("date");
