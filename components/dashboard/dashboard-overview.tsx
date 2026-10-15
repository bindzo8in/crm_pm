"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  FilePlus2,
  Info,
  Plus,
} from "lucide-react";
import {
  Bar,
  CartesianGrid,
  BarChart,
  XAxis,
  YAxis,
} from "recharts";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardChartDateFilter } from "@/components/dashboard/dashboard-chart-date-filter";
import {
  ChartContainer,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type DashboardData = {
  currentRevenue: number;
  revenueChange: number | null;
  newCustomerCount: number;
  customerCount: number;
  pendingInvoiceCount: number;
  receivableTotal: number;
  receivableAging: Array<{ label: string; amount: number; tone: string }>;
  salesReceiptsDues: Array<{
    period: string;
    sales: number;
    receipts: number;
    due: number;
  }>;
  monthlyTrend: Array<{ month: string; monthKey: string; income: number; receivedAmount: number; expenses: number }>;
  chartRangeLabel: string;
  chartRangeError: string | null;
  chartPeriod: "last6months" | "thisFiscalYear" | "previousFiscalYear" | "custom";
  chartFromDate: string;
  chartToDate: string;
  chartStartDate: string;
  chartEndDate: string;
  recentPayments: Array<{
    id: string;
    invoiceId: string;
    amount: number;
    paymentDate: string;
    invoiceNumber: number;
    customerName: string;
  }>;
  recentCustomers: Array<{
    id: string;
    displayName: string;
    companyName: string | null;
    source: string | null;
    createdAt: string;
  }>;
  customerSources: Array<{ source: string | null; count: number }>;
  dueInvoices: Array<{
    id: string;
    invoiceNumber: number;
    customerName: string;
    status: string;
    dueDate: string | null;
    amountDue: number;
  }>;
};

const chartConfig = {
  income: { label: "Income", color: "#3b82f6" },
  receivedAmount: { label: "Received amount", color: "#16a36a" },
  expenses: { label: "Expense", color: "#f97316" },
} satisfies ChartConfig;

const sourceColors = ["bg-violet-500", "bg-sky-500", "bg-emerald-500", "bg-amber-500", "bg-pink-500", "bg-slate-400"];

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" }).format(new Date(date));
}

function formatPercent(value: number | null) {
  if (value === null) return "No previous month to compare";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}% vs last month`;
}

function sourceLabel(source: string | null) {
  if (!source) return "Not specified";
  return source.charAt(0) + source.slice(1).toLowerCase().replaceAll("_", " ");
}

function isOverdue(date: string | null) {
  return date !== null && new Date(date).getTime() < new Date().setHours(0, 0, 0, 0);
}

function formatTooltipCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function getBarValue(value: number | [number, number]) {
  return typeof value === "number" ? value : value[1] - value[0];
}

export function DashboardOverview({
  firstName,
  greeting,
  data,
}: {
  firstName: string;
  greeting: string;
  data: DashboardData;
}) {
  type ChartType = "income" | "receivedAmount" | "expenses";
  const router = useRouter();
  const [activeBar, setActiveBar] = useState<{
    label: string;
    value: number;
    x: number;
    y: number;
  } | null>(null);
  const maxCustomerSource = Math.max(1, ...data.customerSources.map((source) => source.count));

  function selectChartBar(type: ChartType, month: string) {
    const [year, monthIndex] = month.split("-").map(Number);
    const monthStart = Date.UTC(year, monthIndex, 1);
    const monthEnd = Date.UTC(year, monthIndex + 1, 1);
    const chartStart = new Date(`${data.chartStartDate}T00:00:00.000Z`).getTime();
    const chartEnd = new Date(`${data.chartEndDate}T00:00:00.000Z`).getTime() + 86400000;
    const rangeStart = new Date(Math.max(monthStart, chartStart)).toISOString().slice(0, 10);
    const rangeEnd = new Date(Math.min(monthEnd, chartEnd) - 86400000).toISOString().slice(0, 10);
    const params = new URLSearchParams({
      report: type === "income"
        ? "sales-by-customer"
        : type === "receivedAmount"
          ? "payments-received"
          : "expenses-by-vendor",
      startDate: rangeStart,
      endDate: rangeEnd,
    });
    router.push(`/dashboard/reports?${params.toString()}`);
  }

  return (
    <main className="space-y-5 px-4 pb-8 md:px-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-muted-foreground">{formatDate(new Date().toISOString())}</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            {greeting}, {firstName}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">Here’s the latest across your customers and invoices.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href="/dashboard/customers/create"><Plus className="size-4" /> Add customer</Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard/invoices/create"><FilePlus2 className="size-4" /> Create invoice</Link>
          </Button>
        </div>
      </header>

      <section aria-label="Outstanding receivables" className="grid gap-4 xl:grid-cols-[minmax(0,1.8fr)_minmax(250px,0.7fr)]">
        <Card className="shadow-none">
          <CardHeader className="flex flex-row items-center justify-between gap-3 border-b bg-muted/30 py-3">
            <div className="min-w-0">
              <CardTitle className="text-sm font-medium">Total receivables</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                {data.pendingInvoiceCount.toLocaleString("en-IN")} invoices with an outstanding balance
              </p>
            </div>
            <Button className="shrink-0" variant="ghost" size="sm" asChild>
              <Link href="/dashboard/invoices">View invoices</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <p className="text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">
              {formatCurrency(data.receivableTotal)}
            </p>
            <div
              aria-label="Receivables by overdue age"
              className="flex h-2.5 overflow-hidden rounded-sm bg-muted"
              role="group"
            >
              <TooltipProvider>
                {data.receivableAging.map((bucket) => (
                  <Tooltip key={bucket.label}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        aria-label={`${bucket.label}: ${formatCurrency(bucket.amount)}`}
                        className={`${bucket.tone} block h-full min-w-0 shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring`}
                        style={{ width: `${data.receivableTotal > 0 ? (bucket.amount / data.receivableTotal) * 100 : 0}%` }}
                      />
                    </TooltipTrigger>
                    <TooltipContent className="flex-col items-start gap-0.5 px-3 py-2">
                      <span className="text-base font-medium tabular-nums">{formatCurrency(bucket.amount)}</span>
                      <span className="text-xs opacity-80">
                        {bucket.label === "Current"
                          ? "Outstanding · not overdue"
                          : `Outstanding · overdue ${bucket.label.toLowerCase()}`}
                      </span>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </TooltipProvider>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {data.receivableAging.map((bucket) => (
                <div key={bucket.label} className="border-l-2 border-border pl-2.5 first:border-sky-500">
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span aria-hidden="true" className={`size-2 rounded-full ${bucket.tone}`} />
                    {bucket.label === "Current"
                      ? "Current outstanding"
                      : `Overdue · ${bucket.label}`}
                  </p>
                  <p className="mt-1 text-sm font-medium tabular-nums">{formatCurrency(bucket.amount)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader className="border-b bg-muted/30 py-3">
            <CardTitle className="text-sm font-medium">This month</CardTitle>
          </CardHeader>
          <CardContent className="divide-y pt-1">
            <div className="flex items-center justify-between gap-3 py-3">
              <span className="text-sm text-muted-foreground">Revenue received</span>
              <span className="text-sm font-semibold tabular-nums">{formatCurrency(data.currentRevenue)}</span>
            </div>
            <div className="flex items-center justify-between gap-3 py-3">
              <span className="text-sm text-muted-foreground">Change from last month</span>
              <span className={`text-sm font-semibold tabular-nums ${data.revenueChange !== null && data.revenueChange < 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-700 dark:text-emerald-400"}`}>
                {formatPercent(data.revenueChange)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 py-3">
              <span className="text-sm text-muted-foreground">New customers</span>
              <span className="text-sm font-semibold tabular-nums">{data.newCustomerCount.toLocaleString("en-IN")}</span>
            </div>
            <p className="pb-2 text-xs text-muted-foreground">
              {data.customerCount.toLocaleString("en-IN")} active customers in total
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.8fr)_minmax(290px,0.8fr)]">
        <Card className="min-w-0 shadow-none">
          <CardHeader className="gap-3 pb-0">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <CardTitle className="text-base">Income, received amount and expenses</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Monthly totals · {data.chartRangeLabel}
                </p>
              </div>
              <DashboardChartDateFilter
                period={data.chartPeriod}
                fromDate={data.chartFromDate}
                toDate={data.chartToDate}
              />
            </div>
            {data.chartRangeError && (
              <p role="alert" className="text-sm text-destructive">{data.chartRangeError}</p>
            )}
          </CardHeader>
          <CardContent className="pt-5">
            {data.monthlyTrend.every((month) => month.income === 0 && month.receivedAmount === 0 && month.expenses === 0) ? (
              <div className="grid h-[260px] place-items-center rounded-md bg-muted/25 px-6 text-center text-sm text-muted-foreground">
                Income, received amounts and expenses will appear here as you record transactions.
              </div>
            ) : (
              <div className="relative">
                <ChartContainer config={chartConfig} className="h-[280px] w-full">
                  <BarChart data={data.monthlyTrend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      width={72}
                      tickFormatter={(value: number) => new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 }).format(value)}
                    />
                    <Bar
                      dataKey="income"
                      fill="var(--color-income)"
                      radius={[3, 3, 0, 0]}
                      maxBarSize={28}
                      cursor="pointer"
                      onClick={(bar) => void selectChartBar("income", bar.payload.monthKey)}
                      onMouseEnter={(bar) => setActiveBar({
                        label: "Income",
                        value: getBarValue(bar.value),
                        x: bar.x + bar.width / 2,
                        y: bar.y,
                      })}
                      onMouseLeave={() => setActiveBar(null)}
                    />
                    <Bar
                      dataKey="receivedAmount"
                      fill="var(--color-receivedAmount)"
                      radius={[3, 3, 0, 0]}
                      maxBarSize={28}
                      cursor="pointer"
                      onClick={(bar) => void selectChartBar("receivedAmount", bar.payload.monthKey)}
                      onMouseEnter={(bar) => setActiveBar({
                        label: "Received amount",
                        value: getBarValue(bar.value),
                        x: bar.x + bar.width / 2,
                        y: bar.y,
                      })}
                      onMouseLeave={() => setActiveBar(null)}
                    />
                    <Bar
                      dataKey="expenses"
                      fill="var(--color-expenses)"
                      radius={[3, 3, 0, 0]}
                      maxBarSize={28}
                      cursor="pointer"
                      onClick={(bar) => void selectChartBar("expenses", bar.payload.monthKey)}
                      onMouseEnter={(bar) => setActiveBar({
                        label: "Expense",
                        value: getBarValue(bar.value),
                        x: bar.x + bar.width / 2,
                        y: bar.y,
                      })}
                      onMouseLeave={() => setActiveBar(null)}
                    />
                  </BarChart>
                </ChartContainer>
                {activeBar && (
                  <div
                    className="pointer-events-none absolute z-10 min-w-32 -translate-x-1/2 -translate-y-[calc(100%+8px)] rounded-lg border border-border/50 bg-background px-2.5 py-2 shadow-xl"
                    style={{ left: activeBar.x, top: activeBar.y }}
                    role="status"
                  >
                    <p className="text-sm font-medium tabular-nums">{formatTooltipCurrency(activeBar.value)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{activeBar.label}</p>
                  </div>
                )}
              </div>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-2"><span className="size-2.5 rounded-sm bg-blue-500" />Income</span>
              <span className="inline-flex items-center gap-2"><span className="size-2.5 rounded-sm bg-emerald-600" />Received amount</span>
              <span className="inline-flex items-center gap-2"><span className="size-2.5 rounded-sm bg-orange-500" />Expense</span>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader className="flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base">Recent payments</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">Latest invoice receipts</p>
            </div>
            <Button variant="ghost" size="sm" asChild><Link href="/dashboard/finance">View all</Link></Button>
          </CardHeader>
          <CardContent>
            {data.recentPayments.length === 0 ? (
              <div className="rounded-md bg-muted/30 px-3 py-5 text-sm text-muted-foreground">
                No invoice payments recorded yet.
              </div>
            ) : (
              <div className="divide-y">
                {data.recentPayments.map((payment) => (
                  <Link
                    key={payment.id}
                    href={`/dashboard/invoices/${payment.invoiceId}`}
                    className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                        <ArrowDownLeft className="size-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{payment.customerName}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          INV-{payment.invoiceNumber} · {formatDate(payment.paymentDate)}
                        </p>
                      </div>
                    </div>
                    <p className="shrink-0 text-sm font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
                      +{formatCurrency(payment.amount)}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Customer sources</CardTitle>
            <p className="text-sm text-muted-foreground">Where your customer relationships begin</p>
          </CardHeader>
          <CardContent>
            {data.customerSources.length === 0 ? (
              <p className="rounded-md bg-muted/30 px-3 py-4 text-sm text-muted-foreground">Customer source data will appear here.</p>
            ) : (
              <div className="space-y-4">
                {data.customerSources.map((source, index) => (
                  <div key={source.source ?? "unspecified"} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="flex min-w-0 items-center gap-2 truncate">
                        <span className={`size-2.5 shrink-0 rounded-full ${sourceColors[index % sourceColors.length]}`} />
                        {sourceLabel(source.source)}
                      </span>
                      <span className="text-xs tabular-nums text-muted-foreground">{source.count}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full ${sourceColors[index % sourceColors.length]}`}
                        style={{ width: `${(source.count / maxCustomerSource) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader className="flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base">Recent customers</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">Recently added to your CRM</p>
            </div>
            <Button variant="ghost" size="sm" asChild><Link href="/dashboard/customers">View all</Link></Button>
          </CardHeader>
          <CardContent>
            {data.recentCustomers.length === 0 ? (
              <p className="rounded-md bg-muted/30 px-3 py-4 text-sm text-muted-foreground">Add a customer to start building your CRM.</p>
            ) : (
              <div className="divide-y">
                {data.recentCustomers.map((customer) => (
                  <div key={customer.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-sky-50 text-xs font-semibold text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                        {customer.displayName.slice(0, 2).toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{customer.displayName}</p>
                        <p className="truncate text-xs text-muted-foreground">{customer.companyName || sourceLabel(customer.source)}</p>
                      </div>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">{formatDate(customer.createdAt)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader className="flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base">Invoices coming due</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">Keep an eye on outstanding balances</p>
            </div>
            <Button variant="ghost" size="sm" asChild><Link href="/dashboard/invoices">View all</Link></Button>
          </CardHeader>
          <CardContent>
            {data.dueInvoices.length === 0 ? (
              <div className="rounded-md bg-muted/30 px-3 py-4 text-sm text-muted-foreground">
                <CheckCircle2 className="mb-2 size-4 text-emerald-600" />
                No issued invoices with a balance due.
              </div>
            ) : (
              <div className="divide-y">
                {data.dueInvoices.map((invoice) => {
                  const overdue = isOverdue(invoice.dueDate);
                  return (
                    <Link
                      key={invoice.id}
                      href={`/dashboard/invoices/${invoice.id}`}
                      className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span className={`grid size-9 shrink-0 place-items-center rounded-full ${overdue ? "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300" : "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"}`}>
                          <CalendarClock className="size-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">INV-{invoice.invoiceNumber} · {invoice.customerName}</p>
                          <p className={`text-xs ${overdue ? "text-rose-600 dark:text-rose-400" : "text-muted-foreground"}`}>
                            {overdue ? "Overdue" : "Due"} {invoice.dueDate ? formatDate(invoice.dueDate) : "date not set"}
                          </p>
                        </div>
                      </div>
                      <p className="shrink-0 text-sm font-semibold tabular-nums">{formatCurrency(invoice.amountDue)}</p>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <div className="flex items-center justify-end gap-2 border-t pt-4 text-xs text-muted-foreground">
        <ArrowUpRight aria-hidden="true" className="size-3.5" />
        Invoice amounts are converted to INR using each invoice’s exchange rate.
      </div>

      <Card className="overflow-hidden rounded-xl border shadow-none">
        <CardHeader className="flex flex-row items-center gap-1.5 border-b bg-muted/30 px-4 py-3">
          <CardTitle className="text-sm font-medium">Sales, Receipts, and Dues</CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label="About sales, receipts, and dues"
                  className="inline-flex size-5 items-center justify-center rounded-full text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Info className="size-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                Sales are invoiced totals, receipts are payments received, and dues are outstanding balances by invoice due date.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="border-b text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  <th scope="col" className="px-4 py-2.5 text-left font-medium"></th>
                  <th scope="col" className="px-4 py-2.5 text-right font-medium">Sales</th>
                  <th scope="col" className="px-4 py-2.5 text-right font-medium">Receipts</th>
                  <th scope="col" className="px-4 py-2.5 text-right font-medium">Due</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.salesReceiptsDues.map((row) => (
                  <tr key={row.period} className="even:bg-muted/30">
                    <th scope="row" className="px-4 py-3 text-left font-medium">{row.period}</th>
                    <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(row.sales)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(row.receipts)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(row.due)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
