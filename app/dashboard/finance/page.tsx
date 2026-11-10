import {
  getExpenseCategories,
  getFinanceCreators,
  getFinanceOverview,
  getFinanceReport,
  getFinanceSetupStatus,
  getFinancialAccounts,
  listRecentInvoicePayments,
} from "@/actions/finance";
import { FinanceDashboardClient } from "@/components/finance/finance-dashboard-client";
import { requirePageAccess } from "@/lib/auth-guard";
import DashboardContainer from "@/app/dashboard/dashboard-container";

export default async function FinancePage() {
  await requirePageAccess("/dashboard/finance");

  const [overviewResult, accountsResult, categoriesResult, paymentsResult, creatorsResult, reportResult, setupResult] = await Promise.all([
    getFinanceOverview("month"),
    getFinancialAccounts(),
    getExpenseCategories(),
    listRecentInvoicePayments(5),
    getFinanceCreators(),
    getFinanceReport(),
    getFinanceSetupStatus(),
  ]);

  const overview = overviewResult.success && overviewResult.data
    ? {
        receivedIncome: overviewResult.data.receivedIncome,
        completedExpenses: overviewResult.data.completedExpenses,
        netCashFlow: overviewResult.data.netCashFlow,
        currentTotalAccountBalance: overviewResult.data.currentTotalAccountBalance,
        pendingExpenses: overviewResult.data.pendingExpenses,
        outstandingReceivables: overviewResult.data.outstandingReceivables,
        pendingInvoices: overviewResult.data.pendingInvoices,
        pendingInvoiceCount: overviewResult.data.pendingInvoiceCount,
      }
    : null;

  const accounts = accountsResult.success && accountsResult.data
    ? accountsResult.data.map(({ id, name, type, isActive, currentBalance }) => ({ id, name, type, isActive, currentBalance }))
    : [];

  const categories = categoriesResult.success && categoriesResult.data
    ? categoriesResult.data.map(({ id, name, isActive }) => ({ id, name, isActive }))
    : [];

  const invoicePayments = paymentsResult.success && paymentsResult.data
    ? paymentsResult.data.map((payment) => ({
        ...payment,
        paymentDate: payment.paymentDate.toISOString(),
      }))
    : [];

  const creators = creatorsResult.success && creatorsResult.data
      ? creatorsResult.data
      : [];

  const report = reportResult.success && reportResult.data
      ? reportResult.data
      : null;

  const setupStatus = setupResult.success && setupResult.data
    ? {
        ...setupResult.data,
        hasActiveFinancialAccount: accounts.some((account) => account.isActive),
      }
    : null;
  const errorMessages = [
    overviewResult.success ? null : overviewResult.message,
    accountsResult.success ? null : accountsResult.message,
    categoriesResult.success ? null : categoriesResult.message,
    paymentsResult.success ? null : paymentsResult.message,
    creatorsResult.success ? null : creatorsResult.message,
    reportResult.success ? null : reportResult.message,
    setupResult.success ? null : setupResult.message,
  ].filter((message): message is string => message !== null);
  const loadError = [...new Set(errorMessages)]
    .filter((message) => !(
      setupStatus?.companyProfileExists === false &&
      message.toLowerCase().includes("company profile")
    ))
    .join(" ");

  return (
    <DashboardContainer title="Finance">
      <FinanceDashboardClient
        overview={overview}
        accounts={accounts}
        categories={categories}
        invoicePayments={invoicePayments}
        creators={creators}
        report={report}
        setupStatus={setupStatus}
        loadError={loadError || null}
      />
    </DashboardContainer>
  );
}
