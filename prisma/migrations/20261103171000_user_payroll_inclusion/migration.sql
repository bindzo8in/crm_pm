ALTER TABLE "user"
ADD COLUMN IF NOT EXISTS "include_in_payroll" BOOLEAN NOT NULL DEFAULT false;

UPDATE "user"
SET "include_in_payroll" = true
WHERE "role" <> 'SUPER_ADMIN'
  AND (
    EXISTS (
      SELECT 1
      FROM "salary_structure" AS structure
      WHERE structure."userId" = "user"."id"
    )
    OR EXISTS (
      SELECT 1
      FROM "salary_slip" AS slip
      WHERE slip."userId" = "user"."id"
    )
  );
