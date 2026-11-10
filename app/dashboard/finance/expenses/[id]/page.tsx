import Link from "next/link";
import { getExpense } from "@/actions/finance";
import DashboardContainer from "@/app/dashboard/dashboard-container";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExpenseDeleteButton } from "@/components/finance/expense-delete-button";
import { requirePageAccess } from "@/lib/auth-guard";
import { formatDateTimeInIST } from "@/lib/date";

export default async function ExpenseHistoryPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePageAccess("/dashboard/finance");
  const { id } = await params;
  const result = await getExpense(id);

  if (!result.success || !result.data) {
    return <DashboardContainer title="Expense History"><main className="p-6 text-sm text-destructive">{result.message ?? "Expense not found."}</main></DashboardContainer>;
  }

  const expense = result.data;
  return (
    <DashboardContainer title="Expense History">
      <main className="space-y-6 p-4 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b pb-4">
          <div>
            <p className="text-xs text-muted-foreground">{expense.transactionNumber}</p>
            <h1 className="mt-1 text-xl font-semibold">{expense.description}</h1>
            <p className="mt-1 text-sm text-muted-foreground">₹{expense.amount.toString()}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline"><Link href={`/dashboard/finance/expenses/${id}/edit`}>Edit expense</Link></Button>
            <ExpenseDeleteButton expenseId={id} />
          </div>
        </div>
        <section aria-label="Change history">
          <h2 className="mb-3 text-sm font-medium">Change history</h2>
          {expense.history.length ? (
            <ol className="space-y-3">
              {expense.history.map((entry) => (
                <li key={entry.id} className="rounded-lg border px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{entry.action}</Badge>
                      <span className="text-sm">{entry.user.name ?? "Unknown user"}</span>
                    </div>
                    <time className="text-xs text-muted-foreground">{formatDateTimeInIST(entry.createdAt)}</time>
                  </div>
                  {entry.details && <p className="mt-2 break-all text-xs text-muted-foreground">{entry.details}</p>}
                </li>
              ))}
            </ol>
          ) : (
            <p className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">No changes recorded.</p>
          )}
        </section>
      </main>
    </DashboardContainer>
  );
}
