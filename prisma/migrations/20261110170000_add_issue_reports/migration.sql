CREATE TYPE "IssueReportType" AS ENUM ('ISSUE', 'SUGGESTION');
CREATE TYPE "IssueReportStatus" AS ENUM ('NEW', 'IN_REVIEW', 'RESOLVED', 'CLOSED');

CREATE TABLE "issue_report" (
    "id" TEXT NOT NULL,
    "type" "IssueReportType" NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "description" VARCHAR(5000) NOT NULL,
    "status" "IssueReportStatus" NOT NULL DEFAULT 'NEW',
    "response" VARCHAR(2000),
    "created_by_id" TEXT NOT NULL,
    "reviewed_by_id" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "issue_report_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "issue_report_created_by_id_created_at_idx" ON "issue_report"("created_by_id", "created_at");
CREATE INDEX "issue_report_status_created_at_idx" ON "issue_report"("status", "created_at");

ALTER TABLE "issue_report" ADD CONSTRAINT "issue_report_created_by_id_fkey"
    FOREIGN KEY ("created_by_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "issue_report" ADD CONSTRAINT "issue_report_reviewed_by_id_fkey"
    FOREIGN KEY ("reviewed_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
