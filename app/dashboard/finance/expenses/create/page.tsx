import { getFinancialAccounts } from "@/actions/finance";
import DashboardContainer from "@/app/dashboard/dashboard-container";
import { ExpenseEntryForm } from "@/components/finance/expense-entry-form";
import { requirePageAccess } from "@/lib/auth-guard";

export const metadata = {
  title: "Record Expense",
};

export default async function CreateExpensePage() {
  const session = await requirePageAccess("/dashboard/finance");

  const accountsResult = await getFinancialAccounts();

  if (!accountsResult.success) {
    return (
      <DashboardContainer title="Record Expense" back={{ href: "/dashboard/finance", label: "Back to finance" }}>
        <main className="p-4 md:p-6">
          <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            Expense form could not be loaded: {accountsResult.message}
          </div>
        </main>
      </DashboardContainer>
    );
  }

  const accounts = accountsResult.data?.map(({ id, name, isActive }) => ({ id, name, isActive })) ?? [];

  return (
    <DashboardContainer title="Record Expense">
      <ExpenseEntryForm
        accounts={accounts}
        uploadFolder={`finance/expenses/${session.user.id}`}
      />
    </DashboardContainer>
  );
}
