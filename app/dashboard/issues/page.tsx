import { getIssueReportsAction } from "@/actions/issue-reports";
import { IssueReportDesk } from "@/components/issues/issue-report-desk";
import { requirePageAccess } from "@/lib/auth-guard";
import {
  requireIssueReportUser,
} from "@/lib/issue-report-access";
import { canManageIssueReports } from "@/lib/permissions";

export default async function IssueReportsPage() {
  const [session, user, result] = await Promise.all([
    requirePageAccess("/dashboard/issues"),
    requireIssueReportUser(),
    getIssueReportsAction(),
  ]);

  return (
    <IssueReportDesk
      initialReports={result.reports}
      canReview={canManageIssueReports(user)}
      currentUserId={session.user.id}
    />
  );
}
