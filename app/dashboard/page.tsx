import { Prisma } from "@/app/generated/prisma/client";
import { UserRole } from "@/app/generated/prisma/enums";
import { DashboardOverview } from "@/components/dashboard/dashboard-overview";
import { StaffDashboardHome } from "./staff-dashboard-home";
import { requirePageAccess } from "@/lib/auth-guard";
import { canReadDashboard } from "@/lib/permissions";
import type { ReceivableAgeFilter } from "@/lib/reports/report-catalog";
import prisma from "@/lib/prisma";
import { z } from "zod";
import DashboardContainer from "./dashboard-container";
import {
  dateOnlyAtCompanyMidnight,
  formatInIST,
  getAttendanceDate,
  shiftDateOnly,
} from "@/lib/date";

const chartFilterSchema = z.object({
  period: z.enum(["last6months", "thisFiscalYear", "previousFiscalYear", "custom"]).default("thisFiscalYear"),
  fromDate: z.preprocess((value) => value === "" ? undefined : value, z.iso.date().optional()),
  toDate: z.preprocess((value) => value === "" ? undefined : value, z.iso.date().optional()),
}).superRefine((filters, context) => {
  if (filters.period !== "custom") return;
  if (!filters.fromDate) {
    context.addIssue({ code: "custom", message: "Choose a start date", path: ["fromDate"] });
  }
  if (!filters.toDate) {
    context.addIssue({ code: "custom", message: "Choose an end date", path: ["toDate"] });
  }
  if (filters.fromDate && filters.toDate && filters.toDate < filters.fromDate) {
    context.addIssue({ code: "custom", message: "End date must be on or after the start date", path: ["toDate"] });
  }
});

type ChartPeriod = z.infer<typeof chartFilterSchema>["period"];

function monthKey(date: Date) {
  return `${date.getUTCFullYear()}-${date.getUTCMonth()}`;
}

function monthKeyFromDateOnly(value: string) {
  const [year, month] = value.split("-").map(Number);
  return `${year}-${month - 1}`;
}

function getChartRange(period: ChartPeriod, today: string, fromDate?: string, toDate?: string) {
  const [currentYear, oneBasedMonth] = today.split("-").map(Number);
  const currentMonth = oneBasedMonth - 1;
  const fiscalYearStart = currentMonth >= 3 ? currentYear : currentYear - 1;
  const endExclusive = dateOnlyAtCompanyMidnight(shiftDateOnly(today, 1));

  switch (period) {
    case "thisFiscalYear":
      return { start: dateOnlyAtCompanyMidnight(`${fiscalYearStart}-04-01`), endExclusive };
    case "previousFiscalYear":
      return {
        start: dateOnlyAtCompanyMidnight(`${fiscalYearStart - 1}-04-01`),
        endExclusive: dateOnlyAtCompanyMidnight(`${fiscalYearStart}-04-01`),
      };
    case "custom": {
      if (!fromDate || !toDate) return null;
      return {
        start: dateOnlyAtCompanyMidnight(fromDate),
        endExclusive: dateOnlyAtCompanyMidnight(shiftDateOnly(toDate, 1)),
      };
    }
    case "last6months": {
      const firstMonth = new Date(Date.UTC(currentYear, currentMonth - 5, 1));
      const firstMonthDate = `${firstMonth.getUTCFullYear()}-${String(firstMonth.getUTCMonth() + 1).padStart(2, "0")}-01`;
      return {
        start: dateOnlyAtCompanyMidnight(firstMonthDate),
        endExclusive,
      };
    }
  }
}

function getChartRangeLabel(period: ChartPeriod, range: { start: Date; endExclusive: Date }, toDate?: string) {
  if (period === "thisFiscalYear") return "This financial year";
  if (period === "previousFiscalYear") return "Previous financial year";
  if (period === "last6months") return "Last 6 months";
  return `${formatInIST(range.start, "d MMM yyyy")} – ${toDate ? formatInIST(dateOnlyAtCompanyMidnight(toDate), "d MMM yyyy") : ""}`;
}

function getGreeting(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await requirePageAccess("/dashboard");
  const firstName = session.user.name?.trim().split(/\s+/)[0] || "there";
  const greeting = getGreeting(new Date().getHours());

  if (!canReadDashboard(session.user.role as UserRole)) {
    return (
      <StaffDashboardHome
        firstName={firstName}
        greeting={greeting}
        hasDepartment={Boolean(session.user.department?.trim())}
        canViewSalary={session.user.department === "HR"}
      />
    );
  }

  const now = new Date();
  const today = getAttendanceDate(now);
  const [todayYear, todayMonth] = today.split("-").map(Number);
  const currentMonthStart = dateOnlyAtCompanyMidnight(`${todayYear}-${String(todayMonth).padStart(2, "0")}-01`);
  const previousMonth = new Date(Date.UTC(todayYear, todayMonth - 2, 1));
  const previousMonthKey = `${previousMonth.getUTCFullYear()}-${previousMonth.getUTCMonth()}`;
  const query = await searchParams;
  const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
  const rawPeriod = first(query.period) ?? "thisFiscalYear";
  const rawFromDate = first(query.fromDate);
  const rawToDate = first(query.toDate);
  const parsedChartFilters = chartFilterSchema.safeParse({
    period: rawPeriod,
    fromDate: rawFromDate,
    toDate: rawToDate,
  });
  const parsedPeriod = chartFilterSchema.shape.period.safeParse(rawPeriod);
  const chartPeriod: ChartPeriod = parsedPeriod.success ? parsedPeriod.data : "thisFiscalYear";
  const chartRange = parsedChartFilters.success
    ? getChartRange(chartPeriod, today, parsedChartFilters.data.fromDate, parsedChartFilters.data.toDate)
    : getChartRange(chartPeriod === "custom" ? "thisFiscalYear" : chartPeriod, today);
  const chartRangeError = parsedChartFilters.success
    ? null
    : parsedChartFilters.error.issues[0]?.message ?? "Invalid chart date range";
  const chartRangeLabel = chartRange
    ? getChartRangeLabel(
        parsedChartFilters.success ? chartPeriod : chartPeriod === "custom" ? "thisFiscalYear" : chartPeriod,
        chartRange,
        parsedChartFilters.success ? parsedChartFilters.data.toDate : undefined,
      )
    : "Last 6 months";
  const activeChartRange = chartRange ?? getChartRange("thisFiscalYear", today)!;
  const chartStartDate = formatInIST(activeChartRange.start, "yyyy-MM-dd");
  const chartEndDate = formatInIST(new Date(activeChartRange.endExclusive.getTime() - 1), "yyyy-MM-dd");
  const todayStart = dateOnlyAtCompanyMidnight(today);
  const tomorrowStart = dateOnlyAtCompanyMidnight(shiftDateOnly(today, 1));
  const todayUtc = new Date(`${today}T00:00:00.000Z`);
  const weekStartDate = shiftDateOnly(today, -((todayUtc.getUTCDay() + 6) % 7));
  const weekStart = dateOnlyAtCompanyMidnight(weekStartDate);
  const monthStart = currentMonthStart;
  const quarterMonth = Math.floor((todayMonth - 1) / 3) * 3 + 1;
  const quarterStart = dateOnlyAtCompanyMidnight(`${todayYear}-${String(quarterMonth).padStart(2, "0")}-01`);
  const yearStart = dateOnlyAtCompanyMidnight(`${todayYear}-01-01`);
  const fifteenDaysAgo = dateOnlyAtCompanyMidnight(shiftDateOnly(today, -15));
  const thirtyDaysAgo = dateOnlyAtCompanyMidnight(shiftDateOnly(today, -30));
  const fortyFiveDaysAgo = dateOnlyAtCompanyMidnight(shiftDateOnly(today, -45));

  const salesReceiptsDuesPeriods = [
    { label: "Today", start: todayStart, end: tomorrowStart },
    { label: "This Week", start: weekStart, end: tomorrowStart },
    { label: "This Month", start: monthStart, end: tomorrowStart },
    { label: "This Quarter", start: quarterStart, end: tomorrowStart },
    { label: "This Year", start: yearStart, end: tomorrowStart },
  ];
  const [incomeByMonth, receivedByMonth, expensesByMonth, newCustomerCount, customerCount, receivableTotal, salesReceiptsDues, recentPayments, recentCustomers, customerSources, dueInvoices] =
    await Promise.all([
      prisma.$queryRaw<Array<{ month: Date; amount: Prisma.Decimal }>>(Prisma.sql`
        SELECT
          date_trunc('month', i."issueDate" + INTERVAL '5 hours 30 minutes') AS "month",
          COALESCE(SUM(
            i."grandTotal" * CASE WHEN i."currency" = 'INR'
              THEN 1
              ELSE COALESCE(i."exchangeRate", 83.50)
            END
          ), 0) AS "amount"
        FROM "Invoice" i
        WHERE i."issueDate" >= ${activeChartRange.start}
          AND i."issueDate" < ${activeChartRange.endExclusive}
          AND i."deletedAt" IS NULL
          AND i."status" NOT IN ('DRAFT', 'VOID')
        GROUP BY date_trunc('month', i."issueDate" + INTERVAL '5 hours 30 minutes')
        ORDER BY "month" ASC
      `),
      prisma.$queryRaw<Array<{ month: Date; amount: Prisma.Decimal }>>(Prisma.sql`
        SELECT
          date_trunc('month', p."paymentDate" + INTERVAL '5 hours 30 minutes') AS "month",
          COALESCE(SUM(
            CASE WHEN i."currency" = 'INR'
              THEN p."amount"
              ELSE p."amount" * COALESCE(i."exchangeRate", 83.50)
            END
          ), 0) AS "amount"
        FROM "InvoicePayment" p
        INNER JOIN "Invoice" i ON i."id" = p."invoiceId"
        WHERE p."paymentDate" >= ${activeChartRange.start}
          AND p."paymentDate" < ${activeChartRange.endExclusive}
          AND i."deletedAt" IS NULL
          AND i."status" <> 'VOID'
        GROUP BY date_trunc('month', p."paymentDate" + INTERVAL '5 hours 30 minutes')
        ORDER BY "month" ASC
      `),
      prisma.$queryRaw<Array<{ month: Date; amount: Prisma.Decimal }>>(Prisma.sql`
        SELECT
          date_trunc('month', e."expenseDate" + INTERVAL '5 hours 30 minutes') AS "month",
          COALESCE(SUM(e."amount"), 0) AS "amount"
        FROM "Expense" e
        WHERE e."expenseDate" >= ${activeChartRange.start}
          AND e."expenseDate" < ${activeChartRange.endExclusive}
          AND e."deletedAt" IS NULL
          AND e."status" = 'COMPLETED'
        GROUP BY date_trunc('month', e."expenseDate" + INTERVAL '5 hours 30 minutes')
        ORDER BY "month" ASC
      `),
      prisma.customer.count({
        where: { deletedAt: null, createdAt: { gte: currentMonthStart, lte: now } },
      }),
      prisma.customer.count({ where: { deletedAt: null } }),
      prisma.$queryRaw<Array<{
        amount: Prisma.Decimal;
        current: Prisma.Decimal;
        days1to15: Prisma.Decimal;
        days16to30: Prisma.Decimal;
        days31to45: Prisma.Decimal;
        over45Days: Prisma.Decimal;
        count: bigint;
      }>>(Prisma.sql`
        SELECT
          COALESCE(SUM(
            (i."grandTotal" - i."amountPaid") *
            CASE WHEN i."currency" = 'INR'
              THEN 1
              ELSE COALESCE(i."exchangeRate", 83.50)
            END
          ), 0) AS "amount",
          COALESCE(SUM(CASE
            WHEN i."dueDate" IS NULL OR i."dueDate" >= ${todayStart}
            THEN (i."grandTotal" - i."amountPaid") * CASE WHEN i."currency" = 'INR' THEN 1 ELSE COALESCE(i."exchangeRate", 83.50) END
            ELSE 0
          END), 0) AS "current",
          COALESCE(SUM(CASE
            WHEN i."dueDate" < ${todayStart} AND i."dueDate" >= ${fifteenDaysAgo}
            THEN (i."grandTotal" - i."amountPaid") * CASE WHEN i."currency" = 'INR' THEN 1 ELSE COALESCE(i."exchangeRate", 83.50) END
            ELSE 0
          END), 0) AS "days1to15",
          COALESCE(SUM(CASE
            WHEN i."dueDate" < ${fifteenDaysAgo} AND i."dueDate" >= ${thirtyDaysAgo}
            THEN (i."grandTotal" - i."amountPaid") * CASE WHEN i."currency" = 'INR' THEN 1 ELSE COALESCE(i."exchangeRate", 83.50) END
            ELSE 0
          END), 0) AS "days16to30",
          COALESCE(SUM(CASE
            WHEN i."dueDate" < ${thirtyDaysAgo} AND i."dueDate" >= ${fortyFiveDaysAgo}
            THEN (i."grandTotal" - i."amountPaid") * CASE WHEN i."currency" = 'INR' THEN 1 ELSE COALESCE(i."exchangeRate", 83.50) END
            ELSE 0
          END), 0) AS "days31to45",
          COALESCE(SUM(CASE
            WHEN i."dueDate" < ${fortyFiveDaysAgo}
            THEN (i."grandTotal" - i."amountPaid") * CASE WHEN i."currency" = 'INR' THEN 1 ELSE COALESCE(i."exchangeRate", 83.50) END
            ELSE 0
          END), 0) AS "over45Days",
          COUNT(*)::bigint AS "count"
        FROM "Invoice" i
        WHERE i."deletedAt" IS NULL
          AND i."status" IN ('SENT', 'PARTIALLY_PAID', 'OVERDUE')
          AND i."amountPaid" < i."grandTotal"
      `),
      prisma.$queryRaw<Array<{
        period: string;
        sales: Prisma.Decimal;
        receipts: Prisma.Decimal;
        due: Prisma.Decimal;
      }>>(Prisma.sql`
        WITH periods("period", "startDate", "endDate", "sortOrder") AS (
          VALUES ${Prisma.join(salesReceiptsDuesPeriods.map((period, sortOrder) =>
            Prisma.sql`(${period.label}, ${period.start}::timestamp, ${period.end}::timestamp, ${sortOrder})`
          ))}
        )
        SELECT
          p."period",
          COALESCE((
            SELECT SUM(i."grandTotal" * CASE WHEN i."currency" = 'INR'
              THEN 1 ELSE COALESCE(i."exchangeRate", 83.50) END)
            FROM "Invoice" i
            WHERE i."issueDate" >= p."startDate"
              AND i."issueDate" < p."endDate"
              AND i."deletedAt" IS NULL
              AND i."status" NOT IN ('DRAFT', 'VOID')
          ), 0) AS "sales",
          COALESCE((
            SELECT SUM(payment."amount" * CASE WHEN invoice."currency" = 'INR'
              THEN 1 ELSE COALESCE(invoice."exchangeRate", 83.50) END)
            FROM "InvoicePayment" payment
            INNER JOIN "Invoice" invoice ON invoice."id" = payment."invoiceId"
            WHERE payment."paymentDate" >= p."startDate"
              AND payment."paymentDate" < p."endDate"
              AND invoice."deletedAt" IS NULL
              AND invoice."status" <> 'VOID'
          ), 0) AS "receipts",
          COALESCE((
            SELECT SUM(GREATEST(i."grandTotal" - i."amountPaid", 0) * CASE WHEN i."currency" = 'INR'
              THEN 1 ELSE COALESCE(i."exchangeRate", 83.50) END)
            FROM "Invoice" i
            WHERE i."dueDate" >= p."startDate"
              AND i."dueDate" < p."endDate"
              AND i."deletedAt" IS NULL
              AND i."status" IN ('SENT', 'PARTIALLY_PAID', 'OVERDUE')
              AND i."amountPaid" < i."grandTotal"
          ), 0) AS "due"
        FROM periods p
        ORDER BY p."sortOrder"
      `),
      prisma.invoicePayment.findMany({
        where: {
          invoice: { deletedAt: null, status: { not: "VOID" } },
        },
        orderBy: { paymentDate: "desc" },
        take: 5,
        select: {
          id: true,
          amount: true,
          paymentDate: true,
          invoice: {
            select: {
                id: true,
                invoiceNumber: true,
              customerDisplayName: true,
              currency: true,
              exchangeRate: true,
            },
          },
        },
      }),
      prisma.customer.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, displayName: true, companyName: true, source: true, createdAt: true },
      }),
      prisma.customer.groupBy({
        by: ["source"],
        where: { deletedAt: null },
        _count: { _all: true },
        orderBy: { _count: { source: "desc" } },
      }),
      prisma.invoice.findMany({
        where: {
          deletedAt: null,
          status: { in: ["SENT", "PARTIALLY_PAID", "OVERDUE"] },
          dueDate: { not: null },
        },
        orderBy: [{ dueDate: "asc" }, { invoiceNumber: "desc" }],
        take: 6,
        select: {
          id: true,
          invoiceNumber: true,
          customerDisplayName: true,
          status: true,
          dueDate: true,
          grandTotal: true,
          amountPaid: true,
          currency: true,
          exchangeRate: true,
        },
      }),
    ]);

  const monthNames: Array<{ key: string; label: string }> = [];
  const [chartStartYear, chartStartMonth] = chartStartDate.split("-").map(Number);
  const [chartEndYear, chartEndMonth] = chartEndDate.split("-").map(Number);
  const monthCursor = new Date(Date.UTC(
    chartStartYear,
    chartStartMonth - 1,
    1,
  ));
  while (
    monthCursor.getUTCFullYear() < chartEndYear ||
    (monthCursor.getUTCFullYear() === chartEndYear && monthCursor.getUTCMonth() <= chartEndMonth - 1)
  ) {
    monthNames.push({
      key: `${monthCursor.getUTCFullYear()}-${monthCursor.getUTCMonth()}`,
      label: new Intl.DateTimeFormat("en", { month: "short", year: "numeric", timeZone: "UTC" }).format(monthCursor),
    });
    monthCursor.setUTCMonth(monthCursor.getUTCMonth() + 1);
  }
  const incomeMap = new Map(incomeByMonth.map((row) => [
    monthKey(row.month),
    row.amount.toNumber(),
  ]));
  const receivedMap = new Map(receivedByMonth.map((row) => [
    monthKey(row.month),
    row.amount.toNumber(),
  ]));
  const expensesMap = new Map(expensesByMonth.map((row) => [
    monthKey(row.month),
    row.amount.toNumber(),
  ]));
  const monthlyTrend = monthNames.map(({ key, label }) => ({
    month: label,
    monthKey: key,
    income: incomeMap.get(key) ?? 0,
    receivedAmount: receivedMap.get(key) ?? 0,
    expenses: expensesMap.get(key) ?? 0,
  }));
  const currentRevenue = receivedMap.get(monthKeyFromDateOnly(today)) ?? 0;
  const previousRevenue = receivedMap.get(previousMonthKey) ?? 0;
  const revenueChange = previousRevenue > 0
    ? ((currentRevenue - previousRevenue) / previousRevenue) * 100
    : null;

  const formatAmountInInr = (amount: Prisma.Decimal, currency: string, exchangeRate: Prisma.Decimal | null) =>
    amount.toNumber() * (currency === "INR" ? 1 : exchangeRate?.toNumber() ?? 83.5);

  const receivableAging = [
    { label: "Current", age: "CURRENT", amount: receivableTotal[0]?.current.toNumber() ?? 0, tone: "bg-sky-500" },
    { label: "1–15 days", age: "DAYS_1_15", amount: receivableTotal[0]?.days1to15.toNumber() ?? 0, tone: "bg-amber-400" },
    { label: "16–30 days", age: "DAYS_16_30", amount: receivableTotal[0]?.days16to30.toNumber() ?? 0, tone: "bg-orange-500" },
    { label: "31–45 days", age: "DAYS_31_45", amount: receivableTotal[0]?.days31to45.toNumber() ?? 0, tone: "bg-rose-500" },
    { label: "Over 45 days", age: "OVER_45", amount: receivableTotal[0]?.over45Days.toNumber() ?? 0, tone: "bg-red-700" },
  ] satisfies Array<{ label: string; age: ReceivableAgeFilter; amount: number; tone: string }>;

  const dashboardData = {
    currentRevenue,
    revenueChange,
    newCustomerCount,
    customerCount,
    pendingInvoiceCount: Number(receivableTotal[0]?.count ?? BigInt(0)),
    receivableTotal: receivableTotal[0]?.amount.toNumber() ?? 0,
    receivableAging,
    salesReceiptsDues: salesReceiptsDues.map((row) => ({
      period: row.period,
      sales: row.sales.toNumber(),
      receipts: row.receipts.toNumber(),
      due: row.due.toNumber(),
    })),
    monthlyTrend,
    chartRangeLabel,
    chartRangeError,
    chartPeriod,
    chartFromDate: rawFromDate ?? "",
    chartToDate: rawToDate ?? "",
    chartStartDate,
    chartEndDate,
    recentPayments: recentPayments.map((payment) => ({
      id: payment.id,
      invoiceId: payment.invoice.id,
      amount: formatAmountInInr(payment.amount, payment.invoice.currency, payment.invoice.exchangeRate),
      paymentDate: payment.paymentDate.toISOString(),
      invoiceNumber: payment.invoice.invoiceNumber,
      customerName: payment.invoice.customerDisplayName,
    })),
    recentCustomers: recentCustomers.map((customer) => ({
      ...customer,
      createdAt: customer.createdAt.toISOString(),
    })),
    customerSources: customerSources.map((source) => ({
      source: source.source,
      count: source._count._all,
    })),
    dueInvoices: dueInvoices.map((invoice) => ({
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      customerName: invoice.customerDisplayName,
      status: invoice.status,
      dueDate: invoice.dueDate?.toISOString() ?? null,
      amountDue: Math.max(0, formatAmountInInr(
        new Prisma.Decimal(invoice.grandTotal.toNumber() - invoice.amountPaid.toNumber()),
        invoice.currency,
        invoice.exchangeRate,
      )),
    })).filter((invoice) => invoice.amountDue > 0),
  };

  return (
    <DashboardContainer title="Dashboard">
      <DashboardOverview
        firstName={firstName}
        greeting={getGreeting(now.getHours())}
        data={dashboardData}
      />
    </DashboardContainer>
  );
}
