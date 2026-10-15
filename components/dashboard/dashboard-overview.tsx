"use client";

import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  FileClock,
  FilePlus2,
  Landmark,
  Plus,
  UsersRound,
} from "lucide-react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
} from "recharts";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

type DashboardData = {
  currentRevenue: number;
  revenueChange: number | null;
  newCustomerCount: number;
  customerCount: number;
  pendingInvoiceCount: number;
  receivableTotal: number;
  monthlyTrend: Array<{ month: string; revenue: number; newCustomers: number }>;
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
  revenue: { label: "Revenue received", color: "#7256ee" },
  newCustomers: { label: "New customers", color: "#13b981" },
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

function StatCard({
  title,
  value,
  note,
  icon: Icon,
  tone,
}: {
  title: string;
  value: string;
  note: string;
  icon: typeof CircleDollarSign;
  tone: "violet" | "green" | "amber" | "blue";
}) {
  const tones = {
    violet: "bg-violet-50 text-violet-700 ring-violet-100 dark:bg-violet-950/50 dark:text-violet-300 dark:ring-violet-900",
    green: "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-900",
    amber: "bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-950/50 dark:text-amber-300 dark:ring-amber-900",
    blue: "bg-sky-50 text-sky-700 ring-sky-100 dark:bg-sky-950/50 dark:text-sky-300 dark:ring-sky-900",
  };

  return (
    <Card className="gap-3 border-border/70 shadow-none">
      <CardContent className="flex items-start justify-between gap-4 p-4 sm:p-5">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="mt-2 truncate text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{note}</p>
        </div>
        <span className={`grid size-11 shrink-0 place-items-center rounded-xl ring-1 ${tones[tone]}`}>
          <Icon aria-hidden="true" className="size-5" />
        </span>
      </CardContent>
    </Card>
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
  const maxCustomerSource = Math.max(1, ...data.customerSources.map((source) => source.count));

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

      <section aria-label="Business summary" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Revenue received"
          value={formatCurrency(data.currentRevenue)}
          note={formatPercent(data.revenueChange)}
          icon={CircleDollarSign}
          tone="violet"
        />
        <StatCard
          title="New customers"
          value={data.newCustomerCount.toLocaleString("en-IN")}
          note={`${data.customerCount.toLocaleString("en-IN")} active customers`}
          icon={UsersRound}
          tone="green"
        />
        <StatCard
          title="Invoices awaiting payment"
          value={data.pendingInvoiceCount.toLocaleString("en-IN")}
          note="Sent, partially paid, or overdue"
          icon={FileClock}
          tone="amber"
        />
        <StatCard
          title="Balance due"
          value={formatCurrency(data.receivableTotal)}
          note="Outstanding on issued invoices"
          icon={Landmark}
          tone="blue"
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.8fr)_minmax(290px,0.8fr)]">
        <Card className="min-w-0 shadow-none">
          <CardHeader className="pb-0">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="text-base">Revenue and customer growth</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">Monthly collections and new customer registrations</p>
              </div>
              <Badge variant="outline">Last 6 months</Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-5">
            {data.monthlyTrend.every((month) => month.revenue === 0 && month.newCustomers === 0) ? (
              <div className="grid h-[260px] place-items-center rounded-md bg-muted/25 px-6 text-center text-sm text-muted-foreground">
                Revenue and customer activity will appear here as your business records grow.
              </div>
            ) : (
              <ChartContainer config={chartConfig} className="h-[280px] w-full">
                <ComposedChart data={data.monthlyTrend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                  <YAxis
                    yAxisId="revenue"
                    tickLine={false}
                    axisLine={false}
                    width={72}
                    tickFormatter={(value: number) => new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 }).format(value)}
                  />
                  <YAxis yAxisId="customers" orientation="right" tickLine={false} axisLine={false} width={32} />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value, name) => (
                          <span className="font-medium">
                            {name === "revenue" ? formatCurrency(Number(value)) : `${value} customers`}
                          </span>
                        )}
                      />
                    }
                  />
                  <Bar yAxisId="revenue" dataKey="revenue" fill="var(--color-revenue)" radius={[4, 4, 0, 0]} maxBarSize={34} />
                  <Line
                    yAxisId="customers"
                    dataKey="newCustomers"
                    type="monotone"
                    stroke="var(--color-newCustomers)"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: "var(--color-newCustomers)", strokeWidth: 0 }}
                    activeDot={{ r: 5 }}
                  />
                </ComposedChart>
              </ChartContainer>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-2"><span className="size-2.5 rounded-sm bg-violet-500" />Revenue received</span>
              <span className="inline-flex items-center gap-2"><span className="size-2.5 rounded-full bg-emerald-500" />New customers</span>
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
    </main>
  );
}
