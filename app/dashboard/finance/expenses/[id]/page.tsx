import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";

import { getExpense } from "@/actions/finance";
import DashboardContainer from "@/app/dashboard/dashboard-container";
import { ExpenseReceiptPreview } from "@/components/finance/expense-receipt-preview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requirePageAccess } from "@/lib/auth-guard";
import { formatDateTimeInIST, formatInIST } from "@/lib/date";
import { parseExpenseReceiptUrl } from "@/lib/expense-receipt";
import { formatCurrency } from "@/lib/utils";

function displayLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default async function ExpenseHistoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePageAccess("/dashboard/finance");
  const { id } = await params;
  const result = await getExpense(id);

  if (!result.success || !result.data) {
    return (
      <DashboardContainer title="Expense details">
        <main className="p-6 text-sm text-destructive">
          {result.message ?? "Expense not found."}
        </main>
      </DashboardContainer>
    );
  }

  const expense = result.data;
  const receipt = expense.receiptUrl
    ? parseExpenseReceiptUrl(expense.receiptUrl)
    : null;
  const receiptEndpoint = `/api/finance/expenses/${encodeURIComponent(id)}/receipt`;
  const customerName =
    expense.customer?.displayName?.trim()
    || expense.customer?.companyName?.trim()
    || expense.customer?.primaryContactName?.trim();
  const vendorName = expense.vendorName?.trim();
  const counterpartyName = vendorName || customerName || "—";
  const counterpartyLabel = vendorName ? "Vendor" : customerName ? "Customer" : "Vendor";

  return (
    <DashboardContainer title="Expense details">
      <main className="space-y-6 p-4 md:p-6">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b pb-5">
          <div className="min-w-0">
            <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2">
              <Link href="/dashboard/finance">
                <ArrowLeft />
                Finance
              </Link>
            </Button>
            <p className="text-sm text-muted-foreground">{expense.transactionNumber}</p>
            <h1 className="mt-1 break-words text-2xl font-semibold tracking-tight">
              {expense.description}
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href={`/dashboard/finance/expenses/${id}/edit`}>Edit expense</Link>
            </Button>
          </div>
        </header>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(18rem,0.8fr)]">
          <section
            aria-label="Expense receipt"
            className="min-w-0 overflow-hidden rounded-xl border bg-card"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
              <div>
                <h2 className="text-sm font-semibold">Receipt</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Preview the supporting document when you need it
                </p>
              </div>
            </div>

            {receipt ? (
              <div className="p-4 sm:p-5">
                <ExpenseReceiptPreview
                  src={receiptEndpoint}
                  downloadUrl={`${receiptEndpoint}?download=1`}
                  transactionNumber={expense.transactionNumber}
                  contentType={receipt.contentType === "application/pdf" ? "application/pdf" : "image"}
                />
              </div>
            ) : (
              <div className="flex min-h-[26rem] flex-col items-center justify-center gap-3 px-6 text-center">
                <span className="flex size-12 items-center justify-center rounded-full bg-muted">
                  <FileText className="size-5 text-muted-foreground" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-medium">
                    {expense.receiptUrl ? "Receipt preview unavailable" : "No receipt attached"}
                  </p>
                  <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                    {expense.receiptUrl
                      ? "This file is not a supported Cloudinary PDF or image. Edit the expense to replace it."
                      : "Add a receipt or invoice to keep supporting documents with this expense."}
                  </p>
                </div>
                {!expense.receiptUrl && (
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/dashboard/finance/expenses/${id}/edit`}>Add receipt</Link>
                  </Button>
                )}
              </div>
            )}
          </section>

          <aside className="space-y-5">
            <section aria-label="Expense summary" className="rounded-xl border bg-card p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Expense total</p>
                  <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">
                    {formatCurrency(Number(expense.amount))}
                  </p>
                </div>
                <Badge variant={expense.status === "COMPLETED" ? "secondary" : "outline"}>
                  {displayLabel(expense.status)}
                </Badge>
              </div>
              <dl className="mt-5 divide-y">
                <div className="flex justify-between gap-4 py-3 text-sm">
                  <dt className="text-muted-foreground">Date</dt>
                  <dd className="text-right font-medium">{formatInIST(expense.expenseDate, "MMM d, yyyy")}</dd>
                </div>
                <div className="flex justify-between gap-4 py-3 text-sm">
                  <dt className="text-muted-foreground">Category</dt>
                  <dd className="text-right font-medium">{expense.category.name}</dd>
                </div>
                <div className="flex justify-between gap-4 py-3 text-sm">
                  <dt className="text-muted-foreground">{counterpartyLabel}</dt>
                  <dd className="text-right font-medium">{counterpartyName}</dd>
                </div>
                <div className="flex justify-between gap-4 py-3 text-sm">
                  <dt className="text-muted-foreground">Payment method</dt>
                  <dd className="text-right font-medium">{displayLabel(expense.paymentMethod)}</dd>
                </div>
                {expense.referenceNumber && (
                  <div className="flex justify-between gap-4 py-3 text-sm">
                    <dt className="text-muted-foreground">Reference</dt>
                    <dd className="text-right font-medium">{expense.referenceNumber}</dd>
                  </div>
                )}
              </dl>
              {expense.notes && (
                <div className="mt-2 border-t pt-4">
                  <h3 className="text-xs font-medium text-muted-foreground">Notes</h3>
                  <p className="mt-1 whitespace-pre-wrap text-sm">{expense.notes}</p>
                </div>
              )}
            </section>

            {expense.history.length > 0 && (
              <section aria-label="Change history" className="rounded-xl border bg-card p-5">
                <h2 className="text-sm font-semibold">Activity</h2>
                <ol className="mt-4 space-y-4">
                  {expense.history.map((entry) => (
                    <li key={entry.id} className="relative border-l pl-4">
                      <span className="absolute -left-1 top-1 size-2 rounded-full bg-primary" />
                      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                        <Badge variant="outline">{displayLabel(entry.action)}</Badge>
                        <time className="text-xs text-muted-foreground">
                          {formatDateTimeInIST(entry.createdAt)}
                        </time>
                      </div>
                      <p className="mt-1 text-sm">{entry.user.name ?? "Unknown user"}</p>
                      {entry.details && (
                        <p className="mt-1 break-words text-xs text-muted-foreground">
                          {entry.details}
                        </p>
                      )}
                    </li>
                  ))}
                </ol>
              </section>
            )}
          </aside>
        </div>
      </main>
    </DashboardContainer>
  );
}
