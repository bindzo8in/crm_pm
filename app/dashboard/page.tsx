import { Prisma } from "@/app/generated/prisma/client";
import { DashboardOverview } from "@/components/dashboard/dashboard-overview";
import { auth } from "@/lib/auth";
import { requirePageAccess } from "@/lib/auth-guard";
import prisma from "@/lib/prisma";
import { headers } from "next/headers";
import DashboardContainer from "./dashboard-container";

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getGreeting(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default async function Page() {
  await requirePageAccess("/dashboard");

  const now = new Date();
  const currentMonthStart = startOfMonth(now);
  const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const chartStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const session = await auth.api.getSession({ headers: await headers() });
  const firstName = session?.user.name?.trim().split(/\s+/)[0] || "there";

  const [revenueByMonth, customersByMonth, newCustomerCount, customerCount, receivableTotal, recentPayments, recentCustomers, customerSources, dueInvoices] =
    await Promise.all([
      prisma.$queryRaw<Array<{ month: Date; amount: Prisma.Decimal }>>(Prisma.sql`
        SELECT
          date_trunc('month', p."paymentDate") AS "month",
          COALESCE(SUM(
            CASE WHEN i."currency" = 'INR'
              THEN p."amount"
              ELSE p."amount" * COALESCE(i."exchangeRate", 83.50)
            END
          ), 0) AS "amount"
        FROM "InvoicePayment" p
        INNER JOIN "Invoice" i ON i."id" = p."invoiceId"
        WHERE p."paymentDate" >= ${chartStart}
          AND p."paymentDate" <= ${now}
          AND i."deletedAt" IS NULL
          AND i."status" <> 'VOID'
        GROUP BY date_trunc('month', p."paymentDate")
        ORDER BY "month" ASC
      `),
      prisma.$queryRaw<Array<{ month: Date; count: bigint }>>(Prisma.sql`
        SELECT
          date_trunc('month', c."createdAt") AS "month",
          COUNT(*)::bigint AS "count"
        FROM "Customer" c
        WHERE c."createdAt" >= ${chartStart}
          AND c."deletedAt" IS NULL
        GROUP BY date_trunc('month', c."createdAt")
        ORDER BY "month" ASC
      `),
      prisma.customer.count({
        where: { deletedAt: null, createdAt: { gte: currentMonthStart, lte: now } },
      }),
      prisma.customer.count({ where: { deletedAt: null } }),
      prisma.$queryRaw<Array<{ amount: Prisma.Decimal; count: bigint }>>(Prisma.sql`
        SELECT
          COALESCE(SUM(
            (i."grandTotal" - i."amountPaid") *
            CASE WHEN i."currency" = 'INR'
              THEN 1
              ELSE COALESCE(i."exchangeRate", 83.50)
            END
          ), 0) AS "amount",
          COUNT(*)::bigint AS "count"
        FROM "Invoice" i
        WHERE i."deletedAt" IS NULL
          AND i."status" IN ('SENT', 'PARTIALLY_PAID', 'OVERDUE')
          AND i."amountPaid" < i."grandTotal"
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

  const monthNames = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    return {
      key: `${date.getFullYear()}-${date.getMonth()}`,
      label: new Intl.DateTimeFormat("en", { month: "short" }).format(date),
    };
  });
  const revenueMap = new Map(revenueByMonth.map((row) => [
    `${row.month.getFullYear()}-${row.month.getMonth()}`,
    row.amount.toNumber(),
  ]));
  const customerMap = new Map(customersByMonth.map((row) => [
    `${row.month.getFullYear()}-${row.month.getMonth()}`,
    Number(row.count),
  ]));
  const monthlyTrend = monthNames.map(({ key, label }) => ({
    month: label,
    revenue: revenueMap.get(key) ?? 0,
    newCustomers: customerMap.get(key) ?? 0,
  }));
  const currentRevenue = revenueMap.get(`${now.getFullYear()}-${now.getMonth()}`) ?? 0;
  const previousRevenue = revenueMap.get(`${previousMonthStart.getFullYear()}-${previousMonthStart.getMonth()}`) ?? 0;
  const revenueChange = previousRevenue > 0
    ? ((currentRevenue - previousRevenue) / previousRevenue) * 100
    : null;

  const formatAmountInInr = (amount: Prisma.Decimal, currency: string, exchangeRate: Prisma.Decimal | null) =>
    amount.toNumber() * (currency === "INR" ? 1 : exchangeRate?.toNumber() ?? 83.5);

  const dashboardData = {
    currentRevenue,
    revenueChange,
    newCustomerCount,
    customerCount,
    pendingInvoiceCount: Number(receivableTotal[0]?.count ?? BigInt(0)),
    receivableTotal: receivableTotal[0]?.amount.toNumber() ?? 0,
    monthlyTrend,
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
