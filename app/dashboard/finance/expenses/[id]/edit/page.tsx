import { getExpense, getFinancialAccounts } from "@/actions/finance";
import DashboardContainer from "@/app/dashboard/dashboard-container";
import { ExpenseEntryForm } from "@/components/finance/expense-entry-form";
import { requirePageAccess } from "@/lib/auth-guard";

export default async function EditExpensePage({ params }: { params: Promise<{ id: string }> }) {
  await requirePageAccess("/dashboard/finance");
  const { id } = await params;
  const [expenseResult, accountsResult] = await Promise.all([getExpense(id), getFinancialAccounts()]);

  if (!expenseResult.success || !expenseResult.data) {
    return (
      <DashboardContainer title="Edit Expense">
        <main className="p-6">
          <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {expenseResult.message ?? "Expense could not be loaded."}
          </div>
        </main>
      </DashboardContainer>
    );
  }

  if (!accountsResult.success) {
    return <DashboardContainer title="Edit Expense"><main className="p-6 text-sm text-destructive">{accountsResult.message}</main></DashboardContainer>;
  }

  const expense = expenseResult.data;
  return (
    <DashboardContainer title="Edit Expense">
      <ExpenseEntryForm
        accounts={accountsResult.data?.map(({ id, name, type, isActive }) => ({ id, name, type, isActive })) ?? []}
        expense={{
          id: expense.id,
          expenseDate: expense.expenseDate.toISOString(),
          description: expense.description,
          amount: expense.amount.toString(),
          category: expense.category,
          financialAccountId: expense.financialAccountId,
          paymentMethod: expense.paymentMethod,
          vendorName: expense.vendorName,
          referenceNumber: expense.referenceNumber,
          notes: expense.notes,
          status: expense.status,
          receiptUrl: expense.receiptUrl,
          expenseType: expense.expenseType,
          sacCode: expense.sacCode,
          gstTreatment: expense.gstTreatment,
          sourceOfSupply: expense.sourceOfSupply,
          destinationOfSupply: expense.destinationOfSupply,
          reverseCharge: expense.reverseCharge,
          taxRate: expense.taxRate,
          taxInclusive: expense.taxInclusive,
          customer: expense.customer
            ? {
                id: expense.customer.id,
                companyName: expense.customer.companyName,
                primaryContactName: expense.customer.primaryContactName,
              }
            : null,
        }}
      />
    </DashboardContainer>
  );
}
