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
import { type ReceivableAgeFilter } from "@/lib/reports/report-catalog";
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
  receivableAging: Array<{ label: string; age: ReceivableAgeFilter; amount: number; tone: string }>;
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
  income: { label: "Sales", color: "#2d91f4" },
  receivedAmount: { label: "Receipts", color: "#2fc27a" },
  expenses: { label: "Expenses", color: "#fa5a26" },
} satisfies ChartConfig;

const sourceColors = ["bg-violet-500", "bg-sky-500", "bg-emerald-500", "bg-amber-500", "bg-pink-500", "bg-slate-400"];

function MonthAxisTick({
  x = 0,
  y = 0,
  payload,
}: {
  x?: number;
  y?: number;
  payload?: { value?: string };
}) {
  const [month, year] = (payload?.value ?? "").split(" ");

  return (
    <g transform={`translate(${x},${y})`}>
      <text textAnchor="middle" fill="currentColor" fontSize={10}>
        <tspan x={0} dy="0.8em">{month}</tspan>
        <tspan x={0} dy="1.2em">{year}</tspan>
      </text>
    </g>
  );
}

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

function SectionTooltip({ label, description }: { label: string; description: string }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={`About ${label}`}
            className="inline-flex size-5 shrink-0 items-center justify-center rounded-full text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Info aria-hidden="true" className="size-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent>{description}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
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
  const chartTotals = data.monthlyTrend.reduce(
    (totals, month) => ({
      sales: totals.sales + month.income,
      receipts: totals.receipts + month.receivedAmount,
      expenses: totals.expenses + month.expenses,
    }),
    { sales: 0, receipts: 0, expenses: 0 },
  );
  const chartMaxValue = Math.max(
    20_000,
    Math.ceil(Math.max(
      0,
      ...data.monthlyTrend.flatMap((month) => [month.income, month.receivedAmount, month.expenses]),
    ) / 20_000) * 20_000,
  );
  const chartTicks = Array.from(
    { length: chartMaxValue / 20_000 + 1 },
    (_, index) => index * 20_000,
  );

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
    <main className="mx-auto w-full max-w-[1760px] space-y-4 pb-32 sm:space-y-5 md:pb-8">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs text-muted-foreground sm:text-sm">{formatDate(new Date().toISOString())}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            {greeting}, {firstName}
          </h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">Here’s the latest across your customers and invoices.</p>
        </div>
        <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 grid grid-cols-2 gap-2 border-t bg-background/95 p-3 shadow-[0_-8px_24px_rgba(15,23,42,0.06)] backdrop-blur supports-[backdrop-filter]:bg-background/85 md:static md:flex md:border-0 md:bg-transparent md:p-0 md:shadow-none md:backdrop-blur-none md:bottom-auto md:z-auto">
          <Button className="min-h-11 w-full md:w-auto" variant="outline" asChild>
            <Link href="/dashboard/customers/create"><Plus className="size-4" /> Add customer</Link>
          </Button>
          <Button className="min-h-11 w-full md:w-auto" asChild>
            <Link href="/dashboard/invoices/create"><FilePlus2 className="size-4" /> Create invoice</Link>
          </Button>
        </div>
      </header>

      <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <section aria-label="Outstanding receivables" className="min-w-0">
        <Card className="gap-0 overflow-hidden shadow-none">
          <CardHeader className="flex flex-row items-center justify-between gap-3 border-b bg-muted/30 py-3">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <CardTitle className="text-sm font-medium">Total receivables</CardTitle>
                <SectionTooltip
                  label="total receivables"
                  description="Outstanding balances on issued invoices that have not been fully paid."
                />
              </div>
            </div>
            <Button className="shrink-0" variant="ghost" size="sm" asChild>
              <Link href="/dashboard/invoices/create"><Plus className="size-4 text-sky-500" /> New invoice</Link>
            </Button>
          </CardHeader>
          {data.pendingInvoiceCount === 0 ? (
            <CardContent className="flex items-center gap-3 py-6" role="status">
              <CheckCircle2 aria-hidden="true" className="size-5 shrink-0 text-emerald-600" />
              <div>
                <p className="text-sm font-medium">All receivables are settled</p>
                <p className="text-xs text-muted-foreground">There are no outstanding invoice balances.</p>
              </div>
            </CardContent>
          ) : (
            <>
              <CardContent className="space-y-3 pt-4 sm:pt-5">
                <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
                  <div>
                    <p className="text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">
                      {formatTooltipCurrency(data.receivableTotal)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">Outstanding across all accounts</p>
                  </div>
                  <p className="text-xs text-muted-foreground">{data.pendingInvoiceCount.toLocaleString("en-IN")} open invoices</p>
                </div>
                <div
                  aria-label="Receivables by overdue age"
                  className="flex h-2.5 overflow-hidden rounded-full bg-muted"
                  role="group"
                >
                  <TooltipProvider>
                    {data.receivableAging.map((bucket) => (
                      <Tooltip key={bucket.label}>
                        <TooltipTrigger asChild>
                          <Link
                            href={`/dashboard/reports?report=receivable-details&age=${bucket.age}`}
                            aria-label={`${bucket.label}: ${formatCurrency(bucket.amount)}. View matching invoices`}
                            className={`${bucket.tone} block h-full min-w-0 shrink-0 cursor-pointer outline-none hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring`}
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
              </CardContent>
              <div className="grid grid-cols-2 gap-2 border-t px-3 py-3 sm:grid-cols-3 sm:gap-3 sm:px-4 lg:grid-cols-5">
                {data.receivableAging.map((bucket) => (
                  <Link
                    key={bucket.label}
                    href={`/dashboard/reports?report=receivable-details&age=${bucket.age}`}
                    aria-label={bucket.label === "Current"
                      ? "View current invoices with an outstanding balance"
                      : `View invoices overdue ${bucket.label}`}
                    className="block min-w-0 rounded-lg border border-border/80 bg-muted/20 px-2.5 py-2 outline-none transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring lg:rounded-none lg:border-0 lg:border-l lg:bg-transparent lg:px-2 lg:py-1 lg:first:border-sky-500"
                  >
                    <p className={`truncate text-[10px] font-medium uppercase tracking-wide ${bucket.label === "Current" ? "text-sky-600" : "text-orange-600"}`}>
                      {bucket.label}
                    </p>
                    <p className="mt-1 truncate text-sm font-semibold tabular-nums sm:text-base">{formatCurrency(bucket.amount)}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{bucket.label === "Current" ? "Not due yet" : "Overdue"}</p>
                  </Link>
                ))}
              </div>
            </>
          )}
        </Card>
        </section>

        <aside aria-label="Financial summary" className="grid min-w-0 grid-cols-3 gap-2 xl:grid-cols-2 xl:gap-3">
          {[
            { label: "Total sales", value: chartTotals.sales, tone: "text-blue-600 dark:text-blue-400" },
            { label: "Receipts", value: chartTotals.receipts, tone: "text-emerald-700 dark:text-emerald-400" },
            { label: "Expenses", value: chartTotals.expenses, tone: "text-orange-600 dark:text-orange-400" },
          ].map((metric) => (
            <Card key={metric.label} className="min-w-0 shadow-none">
              <CardContent className="px-3 py-3 sm:px-4 sm:py-4">
                <div className="flex items-center gap-1">
                  <p className={`truncate text-[10px] font-medium uppercase tracking-wide sm:text-xs ${metric.tone}`}>{metric.label}</p>
                  <SectionTooltip
                    label={metric.label.toLowerCase()}
                    description={metric.label === "Total sales"
                      ? "Invoice sales for the selected chart period, excluding drafts and void invoices."
                      : metric.label === "Receipts"
                        ? "Payments received for invoices during the selected chart period."
                        : "Completed expenses during the selected chart period."}
                  />
                </div>
                <p className="mt-1 truncate text-sm font-semibold tabular-nums sm:text-lg">
                  {formatCurrency(metric.value)}
                </p>
                <p className="mt-1 hidden truncate text-xs text-muted-foreground sm:block">{data.chartRangeLabel}</p>
              </CardContent>
            </Card>
          ))}
          <Card className="hidden min-w-0 shadow-none xl:block">
            <CardContent className="px-4 py-4">
              <div className="flex items-center gap-1">
                <p className="truncate text-xs font-medium uppercase tracking-wide text-violet-600 dark:text-violet-400">Outstanding due</p>
                <SectionTooltip
                  label="outstanding due"
                  description="Current unpaid balance across all issued invoices."
                />
              </div>
              <p className="mt-1 truncate text-lg font-semibold tabular-nums">{formatCurrency(data.receivableTotal)}</p>
              <p className="mt-1 truncate text-xs text-muted-foreground">
                {data.pendingInvoiceCount.toLocaleString("en-IN")} open invoices
              </p>
            </CardContent>
          </Card>
        </aside>
      </section>

      <section aria-label="Sales and expenses" className="w-full">
        <Card className="min-w-0 gap-0 shadow-none">
          <CardHeader className="flex flex-col justify-between gap-3 border-b bg-muted/30 py-3 sm:flex-row sm:items-center">
            <div className="flex min-w-0 items-center gap-1.5">
              <div>
                <CardTitle className="text-sm font-medium">Sales and Expenses</CardTitle>
              </div>
              <SectionTooltip
                label="sales and expenses"
                description="Compare invoiced sales, payments received, and completed expenses over the selected period."
              />
            </div>
            <div className="w-full sm:w-auto">
              <DashboardChartDateFilter
                period={data.chartPeriod}
                fromDate={data.chartFromDate}
                toDate={data.chartToDate}
              />
            </div>
          </CardHeader>
          <div className="min-w-0">
            <CardContent className="min-w-0 py-4 sm:py-5">
              {data.chartRangeError && (
                <p role="alert" className="mb-2 text-sm text-destructive">{data.chartRangeError}</p>
              )}
              {data.monthlyTrend.every((month) => month.income === 0 && month.receivedAmount === 0 && month.expenses === 0) ? (
                <div className="grid h-[210px] place-items-center rounded-md bg-muted/25 px-6 text-center text-sm text-muted-foreground">
                  Sales, receipts and expenses will appear here as you record transactions.
                </div>
              ) : (
                <div className="relative">
                  <ChartContainer
                    config={chartConfig}
                    className="h-[220px] w-full sm:h-[240px] lg:h-[280px] [&_.recharts-surface:focus:not(:focus-visible)]:outline-none"
                  >
                    <BarChart
                      data={data.monthlyTrend}
                      barGap={1}
                      barCategoryGap="18%"
                      margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid vertical={false} stroke="#dce4f2" strokeDasharray="1 3" />
                      <XAxis
                        dataKey="month"
                        interval={1}
                        tick={<MonthAxisTick />}
                        tickLine={false}
                        axisLine={false}
                        tickMargin={6}
                        height={36}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        width={44}
                        domain={[0, chartMaxValue]}
                        ticks={chartTicks}
                        allowDecimals={false}
                        tick={{ fill: "#526079", fontSize: 10 }}
                        tickFormatter={(value: number) => value === 0
                          ? "0"
                          : `${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(value / 1000)} K`}
                      />
                      <Bar
                        dataKey="income"
                        fill="var(--color-income)"
                        radius={[3, 3, 0, 0]}
                        maxBarSize={12}
                        cursor="pointer"
                        onClick={(bar) => void selectChartBar("income", bar.payload.monthKey)}
                        onMouseEnter={(bar) => setActiveBar({
                          label: "Sales",
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
                        maxBarSize={12}
                        cursor="pointer"
                        onClick={(bar) => void selectChartBar("receivedAmount", bar.payload.monthKey)}
                        onMouseEnter={(bar) => setActiveBar({
                          label: "Receipts",
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
                        maxBarSize={12}
                        cursor="pointer"
                        onClick={(bar) => void selectChartBar("expenses", bar.payload.monthKey)}
                        onMouseEnter={(bar) => setActiveBar({
                          label: "Expenses",
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
              <p className="mt-2 text-[11px] text-muted-foreground sm:text-xs">
                * Sales value displayed is inclusive of tax and includes credits.
              </p>
            </CardContent>
          </div>
        </Card>
      </section>

      <section className="grid min-w-0 gap-4 md:grid-cols-2 2xl:grid-cols-2">
        <Card className="min-w-0 shadow-none">
          <CardHeader className="flex flex-col items-stretch gap-3 pb-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <CardTitle className="text-base">Recent payments</CardTitle>
                <SectionTooltip
                  label="recent payments"
                  description="The latest payments received against customer invoices."
                />
              </div>
              <p className="mt-1 text-sm text-muted-foreground">Latest invoice receipts</p>
            </div>
            <Button className="w-full sm:w-auto" variant="default" size="sm" asChild>
              <Link href="/dashboard/finance">View all</Link>
            </Button>
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
        <Card className="min-w-0 shadow-none">
          <CardHeader className="flex-row items-center justify-between pb-3">
            <div>
              <div className="flex items-center gap-1.5">
                <CardTitle className="text-base">This month</CardTitle>
                <SectionTooltip
                  label="this month"
                  description="Revenue received, change from last month, and new customer activity for the current month."
                />
              </div>
              <p className="mt-1 text-sm text-muted-foreground">A quick view of current activity</p>
            </div>
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

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Card className="shadow-none">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-1.5">
              <CardTitle className="text-base">Customer sources</CardTitle>
              <SectionTooltip
                label="customer sources"
                description="How many customers are associated with each recorded source."
              />
            </div>
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
          <CardHeader className="flex flex-col items-stretch gap-3 pb-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <CardTitle className="text-base">Recent customers</CardTitle>
                <SectionTooltip
                  label="recent customers"
                  description="Customers most recently added to the CRM."
                />
              </div>
              <p className="mt-1 text-sm text-muted-foreground">Recently added to your CRM</p>
            </div>
            <Button className="w-full sm:w-auto" variant="default" size="sm" asChild>
              <Link href="/dashboard/customers">View all</Link>
            </Button>
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
          <CardHeader className="flex flex-col items-stretch gap-3 pb-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <CardTitle className="text-base">Invoices coming due</CardTitle>
                <SectionTooltip
                  label="invoices coming due"
                  description="Issued invoices with an unpaid balance, including overdue invoices."
                />
              </div>
              <p className="mt-1 text-sm text-muted-foreground">Keep an eye on outstanding balances</p>
            </div>
            <Button className="w-full sm:w-auto" variant="default" size="sm" asChild>
              <Link href="/dashboard/invoices">View all</Link>
            </Button>
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
          <SectionTooltip
            label="sales, receipts, and dues"
            description="Sales are invoiced totals, receipts are payments received, and dues are outstanding balances by invoice due date."
          />
        </CardHeader>
        <CardContent className="p-0">
          <div className="hidden overflow-x-auto xl:block">
            <table className="w-full text-sm">
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
          <div className="divide-y px-3 xl:hidden">
            {data.salesReceiptsDues.map((row) => (
              <article key={row.period} className="space-y-2 py-3 first:pt-4 last:pb-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-medium">{row.period}</h3>
                  <p className="text-sm font-semibold tabular-nums">{formatCurrency(row.sales)}</p>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <p className="text-muted-foreground">
                    Receipts <span className="font-medium tabular-nums text-foreground">{formatCurrency(row.receipts)}</span>
                  </p>
                  <p className="text-right text-muted-foreground">
                    Due <span className="font-medium tabular-nums text-foreground">{formatCurrency(row.due)}</span>
                  </p>
                </div>
              </article>
            ))}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
