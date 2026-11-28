CREATE TABLE IF NOT EXISTS "organization_employee_profile" (
  "organizationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "sourceDatabase" TEXT,
  "sourceUserId" TEXT,
  "sourceProfileData" JSONB,
  "displayName" TEXT,
  "applicationRole" TEXT,
  "employmentStatus" "EmploymentStatus",
  "employmentEndedAt" TIMESTAMP(3),
  "department" "Department",
  "additionalDepartments" "Department"[] NOT NULL DEFAULT ARRAY[]::"Department"[],
  "workMode" "WorkMode",
  "includeInAttendanceReports" BOOLEAN,
  "includeInPayroll" BOOLEAN,
  "clockInAlarmEnabled" BOOLEAN,
  "clockOutAlarmEnabled" BOOLEAN,
  "employeeId" TEXT,
  "designation" TEXT,
  "dateOfJoining" TIMESTAMP(3),
  "employmentType" "EmploymentType",
  "annualCtc" DECIMAL(14, 2),
  "bankName" TEXT,
  "bankAccountNo" TEXT,
  "bankIfsc" TEXT,
  "bankAccountType" "BankAccountType",
  "panNo" TEXT,
  "aadhaarNo" TEXT,
  "costCenter" TEXT,
  "uanNo" TEXT,
  "pfNo" TEXT,
  "esiNo" TEXT,
  "pfEligible" BOOLEAN,
  "esiEligible" BOOLEAN,
  "taxRegime" "TaxRegime",
  "paymentMethod" "PaymentMethod",
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "organization_employee_profile_pkey" PRIMARY KEY ("organizationId", "userId"),
  CONSTRAINT "organization_employee_profile_organizationId_userId_fkey"
    FOREIGN KEY ("organizationId", "userId")
    REFERENCES "member"("organizationId", "userId")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "organization_employee_profile_organizationId_employeeId_key"
  ON "organization_employee_profile"("organizationId", "employeeId");
CREATE INDEX IF NOT EXISTS "organization_employee_profile_organizationId_department_idx"
  ON "organization_employee_profile"("organizationId", "department");

CREATE TABLE IF NOT EXISTS "imported_source_record" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "sourceDatabase" TEXT NOT NULL,
  "sourceTable" TEXT NOT NULL,
  "sourceRecordId" TEXT NOT NULL,
  "data" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "imported_source_record_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "imported_source_record_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "imported_source_record_organizationId_sourceDatabase_sourceTable_sourceRecordId_key"
  ON "imported_source_record"("organizationId", "sourceDatabase", "sourceTable", "sourceRecordId");
CREATE INDEX IF NOT EXISTS "imported_source_record_organizationId_sourceTable_idx"
  ON "imported_source_record"("organizationId", "sourceTable");

ALTER TABLE "employee_status_history" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
UPDATE "employee_status_history" h
SET "organizationId" = (
  SELECT m."organizationId"
  FROM "member" m
  WHERE m."userId" = h."user_id"
  ORDER BY m."createdAt", m.id
  LIMIT 1
)
WHERE h."organizationId" IS NULL;
CREATE INDEX IF NOT EXISTS "employee_status_history_organizationId_userId_effectiveAt_idx"
  ON "employee_status_history"("organizationId", "user_id", "effective_at");
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'employee_status_history_organizationId_fkey'
      AND conrelid = 'employee_status_history'::regclass
  ) THEN
    ALTER TABLE "employee_status_history"
      ADD CONSTRAINT "employee_status_history_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "organization"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DROP INDEX IF EXISTS "attendance_record_userId_date_key";
CREATE UNIQUE INDEX "attendance_record_organizationId_userId_date_key"
  ON "attendance_record"("organizationId", "userId", "date");
CREATE UNIQUE INDEX "attendance_record_userId_date_legacy_key"
  ON "attendance_record"("userId", "date")
  WHERE "organizationId" IS NULL;
