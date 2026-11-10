"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowDownLeft, ArrowDownRight, Check, ChevronDown, ChevronLeft, ChevronRight, ExternalLink, Landmark, MoreHorizontal, Pencil, Plus, ReceiptText, SlidersHorizontal, Trash2, Wallet } from "lucide-react";

import { deleteExpense, getFinanceReport } from "@/actions/finance";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRouter } from "next/navigation";
import { formatInIST } from "@/lib/date";
import { toast } from "sonner";

type Overview = {
  receivedIncome: number;
  completedExpenses: number;
  netCashFlow: number;
  currentTotalAccountBalance: number;
  pendingExpenses: number;
  outstandingReceivables: number;
  pendingInvoices: PendingInvoice[];
  pendingInvoiceCount: number;
};

type PendingInvoice = {
  id: string;
  invoiceNumber: number;
  customerDisplayName: string;
  status: string;
  dueDate: string | null;
  amountDue: number;
};

type Account = {
  id: string;
  name: string;
  type: "BANK" | "CASH";
  isActive: boolean;
  currentBalance: number;
};

type Category = {
  id: string;
  name: string;
  isActive: boolean;
};

type InvoicePaymentRow = {
  id: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  referenceId: string | null;
  invoice: {
    id: string;
    invoiceNumber: number;
    customerDisplayName: string;
  };
  financialAccount: { name: string } | null;
};

type Creator = {
  id: string;
  name: string;
};

type ReportRow = {
  id: string;
  type: "INCOME" | "EXPENSE";
  date: string;
  reference: string;
  description: string;
  category: string;
  category_id: string;
  party: string | null;
  payment_method: string;
  account_id: string | null;
  account: string;
  amount: number;
  status: string;
  creator_id: string | null;
  creator: string | null;
  reference_detail: string | null;
  attachment_url: string | null;
  detail_url: string;
};

type ReportResult = {
  rows: ReportRow[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  income: number;
  expenses: number;
  netCashFlow: number;
  startDate: string;
  endDate: string;
};

type FinanceSetupStatus = {
  companyProfileExists: boolean;
  missingCompanyFields: string[];
  hasActiveFinancialAccount: boolean;
};

type Props = {
  overview: Overview | null;
  accounts: Account[];
  categories: Category[];
  invoicePayments: InvoicePaymentRow[];
  creators: Creator[];
  report: ReportResult | null;
  setupStatus: FinanceSetupStatus | null;
  loadError: string | null;
};

type ReportFilters = {
  startDate: string;
  endDate: string;
  type: string;
  categoryId: string;
  accountId: string;
  paymentMethod: string;
  status: string;
  creatorId: string;
  search: string;
  minAmount: string;
  maxAmount: string;
  page: number;
  pageSize: number;
  sort: "date" | "amount" | "description";
  direction: "asc" | "desc";
};

const paymentMethods = [
  ["BANK_TRANSFER", "Bank transfer"],
  ["UPI", "UPI"],
  ["CREDIT_CARD", "Credit card"],
  ["DEBIT_CARD", "Debit card"],
  ["CHEQUE", "Cheque"],
  ["CASH", "Cash"],
  ["OTHER", "Other"],
] as const;

const initialFilters: ReportFilters = {
  startDate: "",
  endDate: "",
  type: "ALL",
  categoryId: "ALL",
  accountId: "ALL",
  paymentMethod: "ALL",
  status: "ALL",
  creatorId: "ALL",
  search: "",
  minAmount: "",
  maxAmount: "",
  page: 0,
  pageSize: 20,
  sort: "date",
  direction: "desc",
};

function TransactionActions({
  row,
  onDelete,
}: {
  row: ReportRow;
  onDelete: (rowId: string) => void;
}) {
  const expenseId = row.type === "EXPENSE" ? row.id.slice("expense:".length) : null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={`Actions for ${row.reference}`}
        >
          <MoreHorizontal aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href={row.detail_url}>
            <ExternalLink aria-hidden="true" />
            {expenseId ? "View expense history" : "View invoice"}
          </Link>
        </DropdownMenuItem>
        {expenseId && (
          <>
            <DropdownMenuItem asChild>
              <Link href={`/dashboard/finance/expenses/${expenseId}/edit`}>
                <Pencil aria-hidden="true" />
                Edit expense
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onSelect={() => onDelete(row.id)}
            >
              <Trash2 aria-hidden="true" />
              Delete expense
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function FinanceReportPanel({
  initialReport,
  initialType = "ALL",
  accounts,
  categories,
  creators,
}: {
  initialReport: ReportResult | null;
  initialType?: ReportFilters["type"];
  accounts: Array<Pick<Account, "id" | "name">>;
  categories: Array<Pick<Category, "id" | "name">>;
  creators: Creator[];
}) {
  const router = useRouter();
  const [report, setReport] = React.useState(initialReport);
  const [filters, setFilters] = React.useState<ReportFilters>({
    ...initialFilters,
    startDate: initialReport?.startDate ?? "",
    endDate: initialReport?.endDate ?? "",
    type: initialType,
  });
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  async function handleDeleteExpense(rowId: string) {
    const expenseId = rowId.startsWith("expense:") ? rowId.slice("expense:".length) : "";
    if (!expenseId || !window.confirm("Delete this expense? Its accounting effect will be removed and this action will be kept in history.")) return;
    try {
      const result = await deleteExpense(expenseId);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success("Expense deleted");
      router.refresh();
      await runReport(filters);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete this expense.");
    }
  }



  async function runReport(nextFilters: ReportFilters) {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const response = await getFinanceReport(nextFilters);
      if (!response.success || !response.data) {
        setErrorMessage(response.message);
        return;
      }
      setReport(response.data);
      setFilters(nextFilters);
    } catch {
      setErrorMessage("Could not load this report. Try again.");
    } finally {
      setIsLoading(false);
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const nextFilters: ReportFilters = {
      ...filters,
      startDate: String(data.get("startDate") ?? ""),
      endDate: String(data.get("endDate") ?? ""),
      type: String(data.get("type") ?? "ALL"),
      categoryId: String(data.get("categoryId") ?? "ALL"),
      accountId: String(data.get("accountId") ?? "ALL"),
      paymentMethod: String(data.get("paymentMethod") ?? "ALL"),
      status: String(data.get("status") ?? "ALL"),
      creatorId: String(data.get("creatorId") ?? "ALL"),
      search: String(data.get("search") ?? ""),
      minAmount: String(data.get("minAmount") ?? ""),
      maxAmount: String(data.get("maxAmount") ?? ""),
      sort: String(data.get("sort") ?? "date") as ReportFilters["sort"],
      direction: String(data.get("direction") ?? "desc") as ReportFilters["direction"],
      page: 0,
    };
    void runReport(nextFilters);
  }

  function changePage(page: number) {
    void runReport({ ...filters, page });
  }

  const selectClassName = "h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
  const activeFilterCount = [
    filters.type !== "ALL",
    filters.categoryId !== "ALL",
    filters.accountId !== "ALL",
    filters.paymentMethod !== "ALL",
    filters.status !== "ALL",
    filters.creatorId !== "ALL",
    Boolean(filters.search),
    Boolean(filters.minAmount),
    Boolean(filters.maxAmount),
  ].filter(Boolean).length;

  return (
    <Card className="shadow-none">
      <CardHeader className="border-b bg-muted/30 py-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">Payments and expenses</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Review recorded transactions for the selected period.
            </p>
          </div>
          {report && (
            <p className="text-xs text-muted-foreground">
              {formatDate(report.startDate)} – {formatDate(report.endDate)}
            </p>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        <details className="group rounded-lg border bg-background">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-3 outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
            <span className="flex items-center gap-2 text-sm font-medium">
              <SlidersHorizontal aria-hidden="true" className="size-4 text-muted-foreground" />
              Filters
              {activeFilterCount > 0 && (
                <Badge variant="secondary">{activeFilterCount} active</Badge>
              )}
            </span>
            <ChevronDown aria-hidden="true" className="size-4 text-muted-foreground transition-transform group-open:rotate-180" />
          </summary>
          <form onSubmit={handleSubmit} className="space-y-3 border-t p-3">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_0.9fr_0.9fr_minmax(180px,1.4fr)_auto]">
            <div className="space-y-1.5">
              <Label htmlFor="report-start-date">From date</Label>
              <Input id="report-start-date" name="startDate" type="date" defaultValue={filters.startDate} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="report-end-date">To date</Label>
              <Input id="report-end-date" name="endDate" type="date" defaultValue={filters.endDate} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="report-type">Transaction type</Label>
              <select id="report-type" name="type" defaultValue={filters.type} className={selectClassName}>
                <option value="ALL">All transactions</option>
                <option value="INCOME">Income</option>
                <option value="EXPENSE">Expenses</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="report-status">Status</Label>
              <select id="report-status" name="status" defaultValue={filters.status} className={selectClassName}>
                <option value="ALL">Any status</option>
                <option value="COMPLETED">Completed</option>
                <option value="PENDING">Pending</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="REVERSED">Reversed</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="report-search">Search transactions</Label>
              <Input id="report-search" name="search" defaultValue={filters.search} placeholder="Reference, customer, vendor…" />
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? "Running…" : "Run report"}
              </Button>
            </div>
          </div>
          <details className="group border-t pt-2">
            <summary className="w-fit cursor-pointer list-none text-sm font-medium text-primary outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
              More filters
            </summary>
            <div className="grid gap-3 pt-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1.5">
                <Label htmlFor="report-category">Category / source</Label>
                <select id="report-category" name="categoryId" defaultValue={filters.categoryId} className={selectClassName}>
                  <option value="ALL">All categories</option>
                  <option value="INVOICE_PAYMENT">Invoice payment income</option>
                  {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="report-account">Account</Label>
                <select id="report-account" name="accountId" defaultValue={filters.accountId} className={selectClassName}>
                  <option value="ALL">All accounts</option>
                  <option value="UNASSIGNED">Account not assigned</option>
                  {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="report-payment-method">Payment method</Label>
                <select id="report-payment-method" name="paymentMethod" defaultValue={filters.paymentMethod} className={selectClassName}>
                  <option value="ALL">Any payment method</option>
                  {paymentMethods.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="report-creator">Created by</Label>
                <select id="report-creator" name="creatorId" defaultValue={filters.creatorId} className={selectClassName}>
                  <option value="ALL">Anyone</option>
                  {creators.map((creator) => <option key={creator.id} value={creator.id}>{creator.name}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="report-min-amount">Minimum amount (₹)</Label>
                <Input id="report-min-amount" name="minAmount" type="number" min="0" step="0.01" defaultValue={filters.minAmount} placeholder="Any" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="report-max-amount">Maximum amount (₹)</Label>
                <Input id="report-max-amount" name="maxAmount" type="number" min="0" step="0.01" defaultValue={filters.maxAmount} placeholder="Any" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="report-sort">Sort by</Label>
                <select id="report-sort" name="sort" defaultValue={filters.sort} className={selectClassName}>
                  <option value="date">Date</option>
                  <option value="amount">Amount</option>
                  <option value="description">Description</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="report-direction">Order</Label>
                <select id="report-direction" name="direction" defaultValue={filters.direction} className={selectClassName}>
                  <option value="desc">Newest / highest first</option>
                  <option value="asc">Oldest / lowest first</option>
                </select>
              </div>
            </div>
          </details>
          </form>
        </details>

        {errorMessage && <p role="alert" className="text-sm text-destructive">{errorMessage}</p>}

        {report && (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Received income</p>
                <p className="mt-1 font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">{formatCurrency(report.income)}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Completed expenses</p>
                <p className="mt-1 font-semibold tabular-nums text-rose-700 dark:text-rose-400">{formatCurrency(report.expenses)}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Net cash flow</p>
                <p className="mt-1 font-semibold tabular-nums">{formatCurrency(report.netCashFlow)}</p>
              </div>
            </div>

            <div className="divide-y rounded-lg border lg:hidden">
              {report.rows.length ? report.rows.map((row) => (
                <article key={row.id} className="space-y-3 px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <Link
                      href={row.detail_url}
                      className="min-w-0 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label={`View transaction ${row.reference}`}
                    >
                      <p className="break-words font-medium text-primary underline-offset-4 hover:underline">{row.reference}</p>
                      <p className="break-words text-xs text-muted-foreground">{row.description}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{formatDate(row.date)}</p>
                    </Link>
                    <div className="flex shrink-0 items-center gap-1">
                      <p className={`text-right text-sm font-semibold tabular-nums ${row.type === "INCOME" ? "text-emerald-700 dark:text-emerald-400" : ""}`}>
                        {row.type === "INCOME" ? "+" : "−"}{formatCurrency(row.amount)}
                      </p>
                      <TransactionActions row={row} onDelete={handleDeleteExpense} />
                    </div>
                  </div>
                  <dl className="grid grid-cols-2 gap-3 rounded-md bg-muted/40 p-3 sm:grid-cols-3">
                    <div className="space-y-1">
                      <dt className="text-[10px] text-muted-foreground">Type / category</dt>
                      <dd className="break-words text-xs font-medium">
                        {row.type === "INCOME" ? "Income" : "Expense"} · {row.category}
                      </dd>
                    </div>
                    <div className="space-y-1">
                      <dt className="text-[10px] text-muted-foreground">Consumer / vendor</dt>
                      <dd className="break-words text-xs font-medium">{row.party ?? "—"}</dd>
                    </div>
                    <div className="space-y-1">
                      <dt className="text-[10px] text-muted-foreground">Attachment</dt>
                      <dd className="text-xs font-medium">
                        {row.attachment_url ? (
                          <a href={row.attachment_url} target="_blank" rel="noreferrer" className="text-primary underline-offset-4 hover:underline">
                            View attachment
                          </a>
                        ) : "—"}
                      </dd>
                    </div>
                    <div className="space-y-1">
                      <dt className="text-[10px] text-muted-foreground">Method</dt>
                      <dd className="break-words text-xs font-medium">{row.payment_method.replaceAll("_", " ")}</dd>
                    </div>
                    <div className="space-y-1">
                      <dt className="text-[10px] text-muted-foreground">Account</dt>
                      <dd className="break-words text-xs font-medium">{row.account}</dd>
                    </div>
                    <div className="space-y-1">
                      <dt className="text-[10px] text-muted-foreground">Created by</dt>
                      <dd className="break-words text-xs font-medium">{row.creator ?? "—"}</dd>
                    </div>
                    <div className="col-span-2 space-y-1 sm:col-span-1">
                      <dt className="text-[10px] text-muted-foreground">Status</dt>
                      <dd>
                        <Badge variant={row.status === "COMPLETED" ? "secondary" : "outline"}>
                          {row.status.charAt(0) + row.status.slice(1).toLowerCase()}
                        </Badge>
                      </dd>
                    </div>
                  </dl>
                </article>
              )) : (
                <p className="px-4 py-10 text-center text-sm text-muted-foreground">No transactions match these filters.</p>
              )}
            </div>

            <div className="hidden overflow-x-auto rounded-lg border lg:block">
              <Table className="min-w-[1120px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Reference / description</TableHead>
                    <TableHead>Type / category</TableHead>
                    <TableHead>Consumer / vendor</TableHead>
                    <TableHead>Attachment</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Created by</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="w-32 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.rows.map((row) => (
                    <TableRow
                      key={row.id}
                      tabIndex={0}
                      aria-label={`View transaction ${row.reference}`}
                      className="cursor-pointer focus-visible:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={() => router.push(row.detail_url)}
                      onKeyDown={(event) => {
                        if (event.target !== event.currentTarget) return;
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          router.push(row.detail_url);
                        }
                      }}
                    >
                      <TableCell>{formatDate(row.date)}</TableCell>
                      <TableCell className="max-w-64">
                        <Link
                          href={row.detail_url}
                          onClick={(event) => event.stopPropagation()}
                          className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <p className="font-medium text-primary underline-offset-4 hover:underline">{row.reference}</p>
                          <p className="truncate text-xs text-muted-foreground">{row.description}</p>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <p>{row.type === "INCOME" ? "Income" : "Expense"}</p>
                        <p className="text-xs text-muted-foreground">{row.category}</p>
                      </TableCell>
                      <TableCell>{row.party ?? "—"}</TableCell>
                      <TableCell onClick={(event) => event.stopPropagation()}>
                        {row.attachment_url ? (
                          <a
                            href={row.attachment_url}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(event) => event.stopPropagation()}
                            className="text-primary underline-offset-4 hover:underline"
                          >
                            View
                          </a>
                        ) : "—"}
                      </TableCell>
                      <TableCell>{row.payment_method.replaceAll("_", " ")}</TableCell>
                      <TableCell>{row.account}</TableCell>
                      <TableCell>{row.creator ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant={row.status === "COMPLETED" ? "secondary" : "outline"}>
                          {row.status.charAt(0) + row.status.slice(1).toLowerCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className={`text-right font-medium tabular-nums ${row.type === "INCOME" ? "text-emerald-700 dark:text-emerald-400" : ""}`}>
                        {row.type === "INCOME" ? "+" : "−"}{formatCurrency(row.amount)}
                      </TableCell>
                      <TableCell className="text-right" onClick={(event) => event.stopPropagation()}>
                        <TransactionActions row={row} onDelete={handleDeleteExpense} />
                      </TableCell>
                    </TableRow>
                  ))}
                  {report.rows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={11} className="h-24 text-center text-muted-foreground">
                        No transactions match these filters.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
              <p className="text-muted-foreground">
                {report.totalCount === 0 ? "No results" : `Showing ${report.page * report.pageSize + 1}–${Math.min((report.page + 1) * report.pageSize, report.totalCount)} of ${report.totalCount}`}
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={isLoading || report.page <= 0} onClick={() => changePage(report.page - 1)}>
                  <ChevronLeft /> Previous
                </Button>
                <span className="text-muted-foreground">Page {report.totalPages === 0 ? 0 : report.page + 1} of {report.totalPages}</span>
                <Button variant="outline" size="sm" disabled={isLoading || report.page + 1 >= report.totalPages} onClick={() => changePage(report.page + 1)}>
                  Next <ChevronRight />
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(value: string | Date) {
  return formatInIST(new Date(value), "dd MMM yyyy");
}

export function FinanceDashboardClient({
  overview,
  accounts,
  categories,
  invoicePayments,
  creators,
  report,
  setupStatus,
  loadError,
}: Props) {
  const companyProfileNeedsAttention = setupStatus !== null &&
    (!setupStatus.companyProfileExists || setupStatus.missingCompanyFields.length > 0);
  const accountNeedsAttention = setupStatus !== null && !setupStatus.hasActiveFinancialAccount;
  const needsSetupGuidance = companyProfileNeedsAttention || accountNeedsAttention;
  const canRecordExpense =
    setupStatus?.companyProfileExists !== false &&
    (setupStatus?.missingCompanyFields.length ?? 0) === 0 &&
    accounts.some((account) => account.isActive) &&
    categories.some((category) => category.isActive);
  const metricCards = [
    { label: "Received income", value: overview?.receivedIncome, icon: ArrowDownLeft, color: "text-emerald-700 dark:text-emerald-400" },
    { label: "Completed expenses", value: overview?.completedExpenses, icon: ArrowDownRight, color: "text-rose-700 dark:text-rose-400" },
    { label: "Net cash flow", value: overview?.netCashFlow, icon: Wallet, color: "text-primary" },
    { label: "Current account balance", value: overview?.currentTotalAccountBalance, icon: Wallet, color: "text-sky-700 dark:text-sky-400" },
    { label: "Pending expenses", value: overview?.pendingExpenses, icon: ReceiptText, color: "text-amber-700 dark:text-amber-400" },
    { label: "Pending invoice income", value: overview?.outstandingReceivables, icon: ReceiptText, color: "text-violet-700 dark:text-violet-400" },
  ];

  return (
    <main className="min-w-0 space-y-6">
      <header className="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Expenses and cash flow</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Record business expenses here. Invoice payments are brought in automatically as received income.
          </p>
        </div>
        {canRecordExpense ? (
          <Button asChild>
            <Link href="/dashboard/finance/expenses/create">
              <Plus />
              Record expense
            </Link>
          </Button>
        ) : (
          <Button disabled>
            <Plus />
            Record expense
          </Button>
        )}
      </header>

      {loadError && (
        <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          Some finance information could not be loaded: {loadError}
        </div>
      )}

      {needsSetupGuidance && (
        <section aria-labelledby="finance-setup-title" className="rounded-xl border bg-card p-5 sm:p-6">
          <div className="max-w-2xl">
            <h3 id="finance-setup-title" className="text-lg font-semibold">
              Finish setting up Finance
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Complete the required company details first. Then you can record expenses and track your balances.
            </p>
          </div>
          <ol className="mt-5 divide-y">
            <li className="py-4 first:pt-0 last:pb-0">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <span className={`grid size-8 shrink-0 place-items-center rounded-full ${!companyProfileNeedsAttention ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" : "bg-muted text-foreground"}`}>
                    {!companyProfileNeedsAttention ? <Check aria-hidden="true" className="size-4" /> : "1"}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {!setupStatus?.companyProfileExists
                        ? "Create your company profile"
                        : setupStatus.missingCompanyFields.length > 0
                          ? "Complete your company profile"
                          : "Company profile"}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {!setupStatus?.companyProfileExists
                        ? "Enter the company name, legal name, email, phone, street address, city, state, and country. GST and PAN details are optional."
                        : setupStatus.missingCompanyFields.length > 0
                          ? `Fill in the required fields: ${setupStatus.missingCompanyFields.join(", ")}.`
                          : "Your required company details are in place."}
                    </p>
                  </div>
                </div>
                <Button variant="outline" className="sm:ml-11" asChild>
                  <Link href="/dashboard/settings/business/company">
                    {companyProfileNeedsAttention ? "Set up company profile" : "Review company profile"}
                  </Link>
                </Button>
              </div>
            </li>
            <li className="py-4 first:pt-0 last:pb-0">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <span className={`grid size-8 shrink-0 place-items-center rounded-full ${!accountNeedsAttention ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" : "bg-muted text-foreground"}`}>
                    {!accountNeedsAttention ? <Check aria-hidden="true" className="size-4" /> : "2"}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">Choose where to track transactions</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {setupStatus?.companyProfileExists
                        ? setupStatus.hasActiveFinancialAccount
                          ? "An active account is ready. Add a bank account if you also want to track bank transactions."
                          : "Add a company bank account to track transactions. Office Cash is created automatically when finance setup is available."
                        : "After saving your company profile, Office Cash is created automatically. You can also add a company bank account."}
                    </p>
                  </div>
                </div>
                {setupStatus?.companyProfileExists ? (
                  <Button variant="outline" className="sm:ml-11" asChild>
                    <Link href="/dashboard/settings/business/banks">Open bank accounts</Link>
                  </Button>
                ) : (
                  <Button variant="outline" className="sm:ml-11" disabled>
                    Complete company profile first
                  </Button>
                )}
              </div>
            </li>
          </ol>
        </section>
      )}

      {setupStatus?.companyProfileExists !== false && (
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid h-auto w-full grid-cols-3 sm:inline-grid sm:w-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="accounts">Accounts</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-5 space-y-5">
          <section aria-label="Finance summary" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {metricCards.map(({ label, value, icon: Icon, color }) => (
              <Card key={label} className="gap-3 border-border/70 shadow-none">
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-0">
                  <CardTitle className="max-w-48 text-sm font-medium text-muted-foreground">{label}</CardTitle>
                  <Icon aria-hidden="true" className={`size-4 ${color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-semibold tabular-nums">
                    {value === undefined ? "Unavailable" : formatCurrency(value)}
                  </div>
                </CardContent>
              </Card>
            ))}
          </section>

          <section className="grid gap-5 xl:grid-cols-2">
            <Card className="shadow-none">
              <CardHeader className="pb-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <CardTitle className="text-base">Pending income from invoices</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Remaining balances on issued invoices; not included in cash received.
                    </p>
                  </div>
                  <Badge variant="outline">{overview?.pendingInvoiceCount ?? 0} open invoices</Badge>
                </div>
              </CardHeader>
              <CardContent>
                {!overview ? (
                  <p className="text-sm text-muted-foreground">Pending invoice balances are unavailable.</p>
                ) : overview.pendingInvoices.length === 0 ? (
                  <p className="rounded-md bg-muted/40 px-3 py-4 text-sm text-muted-foreground">
                    No issued invoices have an outstanding balance.
                  </p>
                ) : (
                  <div className="divide-y">
                    {overview.pendingInvoices.map((invoice) => (
                      <Link
                        key={invoice.id}
                        href={`/dashboard/invoices/${invoice.id}`}
                        className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-medium">INV-{invoice.invoiceNumber}</p>
                            <Badge variant={invoice.status === "OVERDUE" ? "destructive" : "outline"}>
                              {invoice.status === "PAID" ? "Receipt not recorded" : invoice.status.replaceAll("_", " ")}
                            </Badge>
                          </div>
                          <p className="truncate text-sm text-muted-foreground">
                            {invoice.customerDisplayName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {invoice.dueDate ? `Due ${formatDate(invoice.dueDate)}` : "No due date"}
                          </p>
                        </div>
                        <p className="shrink-0 font-semibold tabular-nums text-violet-700 dark:text-violet-400">
                          {formatCurrency(invoice.amountDue)} due
                        </p>
                      </Link>
                    ))}
                    {overview.pendingInvoiceCount > overview.pendingInvoices.length && (
                      <p className="pt-3 text-xs text-muted-foreground">
                        Showing the 10 invoices with the earliest due dates. View the invoice list for all balances.
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-none">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Recent invoice payments</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Automatically sourced from payments recorded on invoices.
                </p>
              </CardHeader>
              <CardContent>
                {invoicePayments.length === 0 ? (
                  <p className="rounded-md bg-muted/40 px-3 py-4 text-sm text-muted-foreground">
                    No invoice payments yet. Record a payment from an invoice to see it here.
                  </p>
                ) : (
                  <div className="divide-y">
                    {invoicePayments.map((payment) => (
                      <Link
                        key={payment.id}
                        href={`/dashboard/invoices/${payment.invoice.id}`}
                        className="flex items-center justify-between gap-4 rounded-sm py-3 first:pt-0 last:pb-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{payment.invoice.customerDisplayName}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            INV-{payment.invoice.invoiceNumber} · {formatDate(payment.paymentDate)} · {payment.paymentMethod.replaceAll("_", " ")}
                          </p>
                          <p className="text-xs text-muted-foreground">{payment.financialAccount?.name ?? "Account not assigned"}</p>
                        </div>
                        <p className="shrink-0 font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
                          +{formatCurrency(payment.amount)}
                        </p>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
        </TabsContent>

        <TabsContent value="transactions" className="mt-5">
          <FinanceReportPanel
            initialReport={report}
            accounts={accounts}
            categories={categories}
            creators={creators}
          />
        </TabsContent>

        <TabsContent value="accounts" className="mt-5">
          <Card className="shadow-none">
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Landmark className="size-4 text-sky-700 dark:text-sky-400" />
                  Account balances
                </CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Cash and bank balances are tracked from opening balances, invoice payments, and completed expenses.
                </p>
              </div>
              <Button variant="outline" asChild>
                <Link href="/dashboard/settings/business/banks">Manage bank accounts</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {accounts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No financial accounts are set up yet.</p>
              ) : (
                <div className="divide-y">
                  {accounts.map((account) => (
                    <div key={account.id} className="flex items-center justify-between gap-3 py-4 first:pt-0 last:pb-0">
                      <div className="flex items-center gap-3">
                        <span className="grid size-10 place-items-center rounded-lg bg-muted">
                          <Landmark className="size-4 text-muted-foreground" />
                        </span>
                        <div>
                          <p className="text-sm font-medium">{account.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {account.type === "CASH" ? "Office cash" : "Company bank account"} · {account.isActive ? "Active" : "Inactive"}
                          </p>
                        </div>
                      </div>
                      <p className={`text-base font-semibold tabular-nums ${account.currentBalance < 0 ? "text-destructive" : ""}`}>
                        {formatCurrency(account.currentBalance)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      )}
    </main>
  );
}
