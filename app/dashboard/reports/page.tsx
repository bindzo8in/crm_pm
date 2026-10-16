import { getBusinessReport } from "@/actions/reports";
import DashboardContainer from "@/app/dashboard/dashboard-container";
import { ReportsCenter } from "@/components/reports/reports-center";
import { auth } from "@/lib/auth";
import { requirePageAccess } from "@/lib/auth-guard";
import { reportCatalog, type ReportId } from "@/lib/reports/report-catalog";
import { headers } from "next/headers";

export const metadata = {
  title: "Reports",
};

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await requirePageAccess("/dashboard/reports");

  const query = await searchParams;
  const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
  const rawType = first(query.type);
  const legacyReport = rawType === "INCOME"
    ? "payments-received"
    : rawType === "EXPENSE"
      ? "expenses-by-vendor"
      : undefined;
  const requestedReport = first(query.report) ?? legacyReport;
  const requestedDefinition = reportCatalog.find((definition) => definition.id === requestedReport);
  const requestedReportId = requestedDefinition?.id ?? null;
  const startDate = first(query.startDate) ?? "";
  const endDate = first(query.endDate) ?? "";
  const search = first(query.search) ?? "";
  const status = first(query.status) ?? "ALL";
  const headersList = await headers();
  const [financeAccess, invoiceAccess, customerAccess, proposalAccess] = await Promise.all([
    auth.api.userHasPermission({ headers: headersList, body: { permissions: { finance: ["read"] } } }),
    auth.api.userHasPermission({ headers: headersList, body: { permissions: { invoices: ["read"] } } }),
    auth.api.userHasPermission({ headers: headersList, body: { permissions: { customers: ["read"] } } }),
    auth.api.userHasPermission({ headers: headersList, body: { permissions: { proposals: ["read"] } } }),
  ]);
  const financeReportsAllowed = financeAccess.success && invoiceAccess.success;
  const retentionAllowed = customerAccess.success && invoiceAccess.success && proposalAccess.success;
  const allowedReports = reportCatalog
    .filter((definition) => {
      if (definition.permission === "finance") return financeReportsAllowed;
      if (definition.permission === "customers") return customerAccess.success;
      if (definition.permission === "proposals") return proposalAccess.success;
      return retentionAllowed;
    })
    .map((definition) => definition.id);

  let initialReport = null;
  let initialError: string | null = null;
  let initialReportId: ReportId | null = requestedReportId;
  if (requestedReportId && !allowedReports.includes(requestedReportId)) {
    initialReportId = null;
    initialError = "You do not have permission to view this report.";
  } else if (requestedReportId) {
    const result = await getBusinessReport({
      reportId: requestedReportId,
      startDate,
      endDate,
      search,
      status,
      page: 0,
      pageSize: 25,
    });
    if (result.success) initialReport = result.data ?? null;
    else initialError = result.message;
  } else if (requestedReport) {
    initialError = "This report type is not available.";
  }

  return (
    <DashboardContainer title="Reports">
      <main className="space-y-5 pb-8">
        <header>
          <p className="mt-1 text-sm text-muted-foreground">
            Explore business performance with reports across your CRM.
          </p>
        </header>
        <ReportsCenter
          allowedReports={allowedReports}
          initialReportId={initialReportId}
          initialFilters={{ startDate, endDate, search, status }}
          initialReport={initialReport}
          initialError={initialError}
        />
      </main>
    </DashboardContainer>
  );
}
