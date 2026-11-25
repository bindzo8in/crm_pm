ALTER TABLE "ProposalTerm" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE "ProposalTemplate" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE "TariffGrid" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE "ProjectTaskStatusTemplate" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE "FinancialAccount" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE "ExpenseCategory" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE "attendance_record" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE "leave_request" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE "holiday" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE "issue_report" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE "notification" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE "salary_structure" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE "salary_slip" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;

UPDATE "ProposalTerm" t
SET "organizationId" = (SELECT o.id FROM "organization" o ORDER BY o."createdAt", o.id LIMIT 1)
WHERE t."organizationId" IS NULL;

UPDATE "ProposalTemplate" t
SET "organizationId" = (SELECT o.id FROM "organization" o ORDER BY o."createdAt", o.id LIMIT 1)
WHERE t."organizationId" IS NULL;

UPDATE "TariffGrid" t
SET "organizationId" = (
  SELECT s."organizationId"
  FROM "TariffGridPackage" gp
  JOIN "ServicePackage" sp ON sp.id = gp."packageId"
  JOIN "Service" s ON s.id = sp."serviceId"
  WHERE gp."tariffGridId" = t.id
    AND s."organizationId" IS NOT NULL
  ORDER BY s."organizationId"
  LIMIT 1
)
WHERE t."organizationId" IS NULL;

UPDATE "Project" p
SET "organizationId" = COALESCE(
  (SELECT pr."organizationId" FROM "Proposal" pr WHERE pr.id = p."proposalId"),
  (SELECT c."organizationId" FROM "Customer" c WHERE c.id = p."customerId"),
  (SELECT o.id FROM "organization" o ORDER BY o."createdAt", o.id LIMIT 1)
)
WHERE p."organizationId" IS NULL;

UPDATE "ProjectTaskStatusTemplate" t
SET "organizationId" = (
  SELECT m."organizationId"
  FROM "member" m
  WHERE m."userId" = t."createdById"
  ORDER BY m.id
  LIMIT 1
)
WHERE t."organizationId" IS NULL;

UPDATE "FinancialAccount" f
SET "organizationId" = (
  SELECT c."organizationId"
  FROM "Company" c
  WHERE c.id = f."companyId"
)
WHERE f."organizationId" IS NULL;

UPDATE "ExpenseCategory" c
SET "organizationId" = (
  SELECT f."organizationId"
  FROM "Expense" e
  JOIN "FinancialAccount" f ON f.id = e."financialAccountId"
  WHERE e."categoryId" = c.id
    AND f."organizationId" IS NOT NULL
  ORDER BY f."organizationId"
  LIMIT 1
)
WHERE c."organizationId" IS NULL;

UPDATE "Expense" e
SET "organizationId" = (
  SELECT f."organizationId"
  FROM "FinancialAccount" f
  WHERE f.id = e."financialAccountId"
)
WHERE e."organizationId" IS NULL;

UPDATE "attendance_record" r
SET "organizationId" = (
  SELECT m."organizationId"
  FROM "member" m
  WHERE m."userId" = r."userId"
  ORDER BY m.id
  LIMIT 1
)
WHERE r."organizationId" IS NULL;

UPDATE "leave_request" r
SET "organizationId" = (
  SELECT m."organizationId"
  FROM "member" m
  WHERE m."userId" = r."userId"
  ORDER BY m.id
  LIMIT 1
)
WHERE r."organizationId" IS NULL;

UPDATE "holiday" h
SET "organizationId" = (SELECT o.id FROM "organization" o ORDER BY o."createdAt", o.id LIMIT 1)
WHERE h."organizationId" IS NULL;

UPDATE "issue_report" i
SET "organizationId" = (
  SELECT m."organizationId"
  FROM "member" m
  WHERE m."userId" = i."created_by_id"
  ORDER BY m.id
  LIMIT 1
)
WHERE i."organizationId" IS NULL;

UPDATE "notification" n
SET "organizationId" = (
  SELECT m."organizationId"
  FROM "member" m
  WHERE m."userId" = n."user_id"
  ORDER BY m.id
  LIMIT 1
)
WHERE n."organizationId" IS NULL;

UPDATE "salary_structure" s
SET "organizationId" = (
  SELECT m."organizationId"
  FROM "member" m
  WHERE m."userId" = s."userId"
  ORDER BY m.id
  LIMIT 1
)
WHERE s."organizationId" IS NULL;

UPDATE "salary_slip" s
SET "organizationId" = (
  SELECT m."organizationId"
  FROM "member" m
  WHERE m."userId" = s."userId"
  ORDER BY m.id
  LIMIT 1
)
WHERE s."organizationId" IS NULL;

ALTER TABLE "ProjectTaskStatusTemplate" DROP CONSTRAINT IF EXISTS "ProjectTaskStatusTemplate_name_key";
ALTER TABLE "ExpenseCategory" DROP CONSTRAINT IF EXISTS "ExpenseCategory_name_key";
ALTER TABLE "holiday" DROP CONSTRAINT IF EXISTS "holiday_date_key";
ALTER TABLE "salary_structure" DROP CONSTRAINT IF EXISTS "salary_structure_userId_key";
ALTER TABLE "salary_slip" DROP CONSTRAINT IF EXISTS "salary_slip_userId_month_year_key";

CREATE UNIQUE INDEX IF NOT EXISTS "ProjectTaskStatusTemplate_organizationId_name_key" ON "ProjectTaskStatusTemplate"("organizationId", "name");
CREATE UNIQUE INDEX IF NOT EXISTS "ExpenseCategory_organizationId_name_key" ON "ExpenseCategory"("organizationId", "name");
CREATE UNIQUE INDEX IF NOT EXISTS "holiday_organizationId_date_key" ON "holiday"("organizationId", "date");
CREATE UNIQUE INDEX IF NOT EXISTS "salary_structure_organizationId_userId_key" ON "salary_structure"("organizationId", "userId");
CREATE UNIQUE INDEX IF NOT EXISTS "salary_slip_organizationId_userId_month_year_key" ON "salary_slip"("organizationId", "userId", "month", "year");

CREATE INDEX IF NOT EXISTS "ProposalTerm_organizationId_isActive_idx" ON "ProposalTerm"("organizationId", "isActive");
CREATE INDEX IF NOT EXISTS "ProposalTemplate_organizationId_idx" ON "ProposalTemplate"("organizationId");
CREATE INDEX IF NOT EXISTS "TariffGrid_organizationId_isActive_idx" ON "TariffGrid"("organizationId", "isActive");
CREATE INDEX IF NOT EXISTS "Project_organizationId_deletedAt_idx" ON "Project"("organizationId", "deletedAt");
CREATE INDEX IF NOT EXISTS "ProjectTaskStatusTemplate_organizationId_name_idx" ON "ProjectTaskStatusTemplate"("organizationId", "name");
CREATE INDEX IF NOT EXISTS "FinancialAccount_organizationId_isActive_idx" ON "FinancialAccount"("organizationId", "isActive");
CREATE INDEX IF NOT EXISTS "ExpenseCategory_organizationId_isActive_idx" ON "ExpenseCategory"("organizationId", "isActive");
CREATE INDEX IF NOT EXISTS "Expense_organizationId_expenseDate_idx" ON "Expense"("organizationId", "expenseDate");
CREATE INDEX IF NOT EXISTS "Expense_organizationId_status_idx" ON "Expense"("organizationId", "status");
CREATE INDEX IF NOT EXISTS "attendance_record_organizationId_date_idx" ON "attendance_record"("organizationId", "date");
CREATE INDEX IF NOT EXISTS "attendance_record_organizationId_userId_date_idx" ON "attendance_record"("organizationId", "userId", "date");
CREATE INDEX IF NOT EXISTS "leave_request_organizationId_status_idx" ON "leave_request"("organizationId", "status");
CREATE INDEX IF NOT EXISTS "leave_request_organizationId_userId_startDate_idx" ON "leave_request"("organizationId", "userId", "startDate");
CREATE INDEX IF NOT EXISTS "holiday_organizationId_date_idx" ON "holiday"("organizationId", "date");
CREATE INDEX IF NOT EXISTS "issue_report_organizationId_status_createdAt_idx" ON "issue_report"("organizationId", "status", "created_at");
CREATE INDEX IF NOT EXISTS "notification_organizationId_userId_readAt_createdAt_idx" ON "notification"("organizationId", "user_id", "read_at", "created_at");
CREATE INDEX IF NOT EXISTS "salary_structure_organizationId_userId_idx" ON "salary_structure"("organizationId", "userId");
CREATE INDEX IF NOT EXISTS "salary_slip_organizationId_month_year_idx" ON "salary_slip"("organizationId", "month", "year");

ALTER TABLE "ProposalTerm" ADD CONSTRAINT "ProposalTerm_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProposalTemplate" ADD CONSTRAINT "ProposalTemplate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TariffGrid" ADD CONSTRAINT "TariffGrid_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Project" ADD CONSTRAINT "Project_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectTaskStatusTemplate" ADD CONSTRAINT "ProjectTaskStatusTemplate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FinancialAccount" ADD CONSTRAINT "FinancialAccount_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExpenseCategory" ADD CONSTRAINT "ExpenseCategory_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "attendance_record" ADD CONSTRAINT "attendance_record_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "leave_request" ADD CONSTRAINT "leave_request_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "holiday" ADD CONSTRAINT "holiday_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "issue_report" ADD CONSTRAINT "issue_report_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notification" ADD CONSTRAINT "notification_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "salary_structure" ADD CONSTRAINT "salary_structure_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "salary_slip" ADD CONSTRAINT "salary_slip_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

