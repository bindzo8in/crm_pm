"use server";

import { Prisma } from "@/app/generated/prisma/client";
import { auth } from "@/lib/auth";
import { errorResponse, successResponse } from "@/lib/action-response";
import {
  calculateExpenseTotals,
  MAX_EXPENSE_TOTAL_CENTS,
  parseExpenseAmountCents,
} from "@/lib/expense-tax";
import { dateOnlyAtCompanyMidnight, formatInIST, getAttendanceDate, shiftDateOnly } from "@/lib/date";
import prisma from "@/lib/prisma";
import {
  expenseCategoryPageSchema,
  expenseCategorySchema,
  expenseSchema,
  financeReportSchema,
  financialAccountSchema,
} from "@/lib/schemas/finance";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

async function getSessionUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return null;
  }
  return session.user;
}

async function checkFinancePermission(action: "read" | "create" | "update" | "delete") {
  try {
    const hasPermission = await auth.api.userHasPermission({
      headers: await headers(),
      body: {
        permissions: {
          finance: [action],
        },
      },
    });
    return hasPermission.success;
  } catch {
    return false;
  }
}

const defaultExpenseCategories = [
  "Office Rent",
  "Employee Salaries",
  "Electricity and Utilities",
  "Internet and Telephone",
  "Software and Subscriptions",
  "Advertising and Marketing",
  "Travel and Transportation",
  "Printing and Stationery",
  "Equipment and Maintenance",
  "Professional Services",
  "Bank Charges",
  "Other Expenses",
];

async function ensureDefaultExpenseCategories() {
  await prisma.expenseCategory.createMany({
    data: defaultExpenseCategories.map((name) => ({ name })),
    skipDuplicates: true,
  });
}

function numberValue(value: number | string | { toNumber: () => number } | null | undefined) {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (value && typeof value === "object" && "toNumber" in value && typeof value.toNumber === "function") {
    return value.toNumber();
  }
  return 0;
}

function buildDateRange(period: string, startDate?: string | null, endDate?: string | null) {
  const now = new Date();
  const today = getAttendanceDate(now);
  const safeEndExclusive = dateOnlyAtCompanyMidnight(shiftDateOnly(endDate ?? today, 1));
  const safeEnd = new Date(safeEndExclusive.getTime() - 1);

  const safeStart = (() => {
    if (startDate) return dateOnlyAtCompanyMidnight(startDate);

    switch (period) {
      case "day": {
        return dateOnlyAtCompanyMidnight(today);
      }
      case "week": {
        return dateOnlyAtCompanyMidnight(shiftDateOnly(today, -6));
      }
      case "month": {
        return dateOnlyAtCompanyMidnight(`${today.slice(0, 7)}-01`);
      }
      case "year": {
        return dateOnlyAtCompanyMidnight(`${today.slice(0, 4)}-01-01`);
      }
      default: {
        return dateOnlyAtCompanyMidnight(shiftDateOnly(today, -30));
      }
    }
  })();

  return {
    gte: safeStart,
    lte: safeEnd,
  };
}

export async function getFinancialAccounts() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return errorResponse("Unauthorized");
    }

    const hasPermission = await checkFinancePermission("read");
    if (!hasPermission) {
      return errorResponse("You do not have permission to view financial accounts");
    }

    const company = await prisma.company.findFirst({
      select: {
        id: true,
        displayName: true,
        bankAccounts: {
          select: { id: true, accountName: true, isActive: true },
        },
      },
    });

    if (!company) {
      return errorResponse("Create the company profile before setting up financial accounts");
    }

    if (company) {
      const openingBalanceDate = new Date();
      openingBalanceDate.setUTCHours(0, 0, 0, 0);

      await prisma.$transaction(async (tx) => {
        await tx.financialAccount.upsert({
          where: {
            companyId_name: {
              companyId: company.id,
              name: "Office Cash",
            },
          },
          update: {},
          create: {
            companyId: company.id,
            name: "Office Cash",
            type: "CASH",
            openingBalance: new Prisma.Decimal(0),
            openingBalanceDate,
          },
        });

        for (const bankAccount of company.bankAccounts) {
          const accountName = `${company.displayName} ${bankAccount.accountName}`;
          if (!bankAccount.isActive) {
            await tx.financialAccount.updateMany({
              where: {
                companyId: company.id,
                companyBankAccountId: bankAccount.id,
              },
              data: { name: accountName, isActive: false },
            });
            continue;
          }

          await tx.financialAccount.upsert({
            where: { companyBankAccountId: bankAccount.id },
            update: { name: accountName, isActive: true },
            create: {
              companyId: company.id,
              name: accountName,
              type: "BANK",
              companyBankAccountId: bankAccount.id,
              openingBalance: new Prisma.Decimal(0),
              openingBalanceDate,
            },
          });
        }
      });
    }

    const accounts = await prisma.financialAccount.findMany({
      where: { companyId: company.id },
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
      include: {
        companyBankAccount: true,
        invoicePayments: {
          where: {
            invoice: { deletedAt: null, status: { not: "VOID" } },
            paymentDate: { lte: new Date() },
          },
          select: { amount: true, paymentDate: true },
        },
        expenses: {
          where: {
            deletedAt: null,
            status: "COMPLETED",
            expenseDate: { lte: new Date() },
          },
          select: { amount: true, expenseDate: true },
        },
      },
    });

    const serializedAccounts = accounts.map((account) => {
      const received = account.invoicePayments.reduce((total, payment) => {
        if (account.openingBalanceDate && payment.paymentDate < account.openingBalanceDate) return total;
        return total + numberValue(payment.amount);
      }, 0);
      const paid = account.expenses.reduce((total, expense) => {
        if (account.openingBalanceDate && expense.expenseDate < account.openingBalanceDate) return total;
        return total + numberValue(expense.amount);
      }, 0);

      return {
        id: account.id,
        name: account.name,
        type: account.type,
        isActive: account.isActive,
        companyBankAccount: account.companyBankAccount,
        openingBalance: numberValue(account.openingBalance),
        currentBalance: numberValue(account.openingBalance) + received - paid,
      };
    });

    return successResponse("Financial accounts retrieved successfully", serializedAccounts);
  } catch (error) {
    console.error("Failed to fetch financial accounts:", error);
    return errorResponse("Failed to fetch financial accounts", error);
  }
}

export async function getFinanceSetupStatus() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return errorResponse("Unauthorized");
    }

    if (!(await checkFinancePermission("read"))) {
      return errorResponse("You do not have permission to view finance setup");
    }

    const company = await prisma.company.findFirst({
      select: {
        displayName: true,
        legalName: true,
        email: true,
        phone: true,
        address: true,
        city: true,
        state: true,
        country: true,
      },
    });

    const requiredCompanyFields = [
      ["displayName", "Company name"],
      ["legalName", "Legal business name"],
      ["email", "Email"],
      ["phone", "Phone"],
      ["address", "Address"],
      ["city", "City"],
      ["state", "State"],
      ["country", "Country"],
    ] as const;

    const missingCompanyFields = company
      ? requiredCompanyFields
          .filter(([field]) => !company[field].trim())
          .map(([, label]) => label)
      : [];

    return successResponse("Finance setup status retrieved successfully", {
      companyProfileExists: Boolean(company),
      missingCompanyFields,
    });
  } catch (error) {
    console.error("Failed to load finance setup status:", error);
    return errorResponse("Could not load finance setup status", error);
  }
}

export async function getExpenseCategories() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return errorResponse("Unauthorized");
    }

    const hasPermission = await checkFinancePermission("read");
    if (!hasPermission) {
      return errorResponse("You do not have permission to view expense categories");
    }

    await ensureDefaultExpenseCategories();

    const categories = await prisma.expenseCategory.findMany({
      orderBy: { name: "asc" },
    });

    return successResponse("Expense categories retrieved successfully", categories);
  } catch (error) {
    return errorResponse("Failed to fetch expense categories", error);
  }
}

export async function getExpenseCategoryPage(input: unknown) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return errorResponse("Unauthorized");
    }

    const hasPermission = await checkFinancePermission("read");
    if (!hasPermission) {
      return errorResponse("You do not have permission to view expense categories");
    }

    const parsed = expenseCategoryPageSchema.safeParse(input);
    if (!parsed.success) {
      return errorResponse("Invalid expense category query", parsed.error.flatten());
    }

    await ensureDefaultExpenseCategories();

    const { search, cursor, pageSize } = parsed.data;
    const categories = await prisma.expenseCategory.findMany({
      where: {
        isActive: true,
        ...(search
          ? { name: { contains: search, mode: "insensitive" } }
          : {}),
      },
      select: { id: true, name: true, isActive: true },
      orderBy: [{ name: "asc" }, { id: "asc" }],
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      take: pageSize + 1,
    });

    const hasNextPage = categories.length > pageSize;
    const items = hasNextPage ? categories.slice(0, pageSize) : categories;

    return successResponse("Expense categories retrieved successfully", {
      items,
      hasNextPage,
      nextCursor: hasNextPage ? items[items.length - 1]?.id ?? null : null,
    });
  } catch (error) {
    console.error("Failed to fetch expense category page:", error);
    return errorResponse("Failed to fetch expense categories", error);
  }
}

export async function listRecentInvoicePayments(limit = 5) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return errorResponse("Unauthorized");
    }

    const hasPermission = await checkFinancePermission("read");
    if (!hasPermission) {
      return errorResponse("You do not have permission to view invoice payments");
    }

    const payments = await prisma.invoicePayment.findMany({
      where: {
        invoice: {
          deletedAt: null,
          status: { not: "VOID" },
        },
      },
      orderBy: { paymentDate: "desc" },
      take: Math.min(Math.max(limit, 1), 20),
      select: {
        id: true,
        amount: true,
        paymentDate: true,
        paymentMethod: true,
        referenceId: true,
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            customerDisplayName: true,
          },
        },
        financialAccount: {
          select: { name: true },
        },
      },
    });

    return successResponse(
      "Recent invoice payments retrieved successfully",
      payments.map((payment) => ({
        ...payment,
        amount: numberValue(payment.amount),
      })),
    );
  } catch (error) {
    return errorResponse("Failed to fetch invoice payments", error);
  }
}

export async function getFinanceCreators() {
  try {
    const user = await getSessionUser();
    if (!user) return errorResponse("Unauthorized");

    const hasPermission = await checkFinancePermission("read");
    if (!hasPermission) return errorResponse("You do not have permission to view finance reports");

    const users = await prisma.user.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
    return successResponse("Finance report users retrieved successfully", users);
  } catch (error) {
    console.error("Failed to fetch finance report users:", error);
    return errorResponse("Failed to fetch finance report users", error);
  }
}

type FinanceReportRow = {
  id: string;
  type: "INCOME" | "EXPENSE";
  date: Date;
  reference: string;
  description: string;
  category: string;
  category_id: string;
  party: string | null;
  payment_method: string;
  account_id: string | null;
  account: string;
  amount: Prisma.Decimal;
  status: string;
  creator_id: string | null;
  creator: string | null;
  reference_detail: string | null;
  attachment_url: string | null;
  detail_url: string;
};

export async function getFinanceReport(input: unknown = {}) {
  try {
    const user = await getSessionUser();
    if (!user) return errorResponse("Unauthorized");

    const hasPermission = await checkFinancePermission("read");
    if (!hasPermission) return errorResponse("You do not have permission to view finance reports");

    const parsed = financeReportSchema.safeParse(input);
    if (!parsed.success) {
      return errorResponse("Invalid finance report filters", parsed.error.flatten());
    }

    const filters = parsed.data;
    const today = getAttendanceDate();
    const startDate = filters.startDate
      ? dateOnlyAtCompanyMidnight(filters.startDate)
      : dateOnlyAtCompanyMidnight(`${today.slice(0, 7)}-01`);
    const endExclusive = filters.endDate
      ? dateOnlyAtCompanyMidnight(shiftDateOnly(filters.endDate, 1))
      : dateOnlyAtCompanyMidnight(shiftDateOnly(today, 1));

    if (filters.startDate && Number.isNaN(startDate.getTime())) {
      return errorResponse("Start date is invalid");
    }
    if (filters.endDate && Number.isNaN(endExclusive.getTime())) {
      return errorResponse("End date is invalid");
    }
    if (endExclusive <= startDate) {
      return errorResponse("End date must be on or after the start date");
    }
    if (filters.minAmount && filters.maxAmount && Number(filters.minAmount) > Number(filters.maxAmount)) {
      return errorResponse("Minimum amount cannot be greater than maximum amount");
    }

    const company = await prisma.company.findFirst({ select: { id: true } });
    if (!company) {
      return errorResponse("Create the company profile before running finance reports");
    }

    const conditions: Prisma.Sql[] = [
      Prisma.sql`"date" >= ${startDate}`,
      Prisma.sql`"date" < ${endExclusive}`,
    ];
    if (filters.type !== "ALL") conditions.push(Prisma.sql`"type" = ${filters.type}`);
    if (filters.categoryId !== "ALL") conditions.push(Prisma.sql`"category_id" = ${filters.categoryId}`);
    if (filters.accountId === "UNASSIGNED") {
      conditions.push(Prisma.sql`"account_id" IS NULL`);
    } else if (filters.accountId !== "ALL") {
      conditions.push(Prisma.sql`"account_id" = ${filters.accountId}`);
    }
    if (filters.paymentMethod !== "ALL") conditions.push(Prisma.sql`"payment_method" = ${filters.paymentMethod}`);
    if (filters.status !== "ALL") conditions.push(Prisma.sql`"status" = ${filters.status}`);
    if (filters.creatorId !== "ALL") conditions.push(Prisma.sql`"creator_id" = ${filters.creatorId}`);
    if (filters.minAmount) conditions.push(Prisma.sql`"amount" >= ${new Prisma.Decimal(filters.minAmount)}`);
    if (filters.maxAmount) conditions.push(Prisma.sql`"amount" <= ${new Prisma.Decimal(filters.maxAmount)}`);
    if (filters.search) {
      const searchTerm = `%${filters.search}%`;
      conditions.push(Prisma.sql`(
        "reference" ILIKE ${searchTerm}
        OR "description" ILIKE ${searchTerm}
        OR COALESCE("party", '') ILIKE ${searchTerm}
        OR COALESCE("reference_detail", '') ILIKE ${searchTerm}
        OR "account" ILIKE ${searchTerm}
        OR "category" ILIKE ${searchTerm}
      )`);
    }

    const companyId = company.id;
    const transactionRows = Prisma.sql`
      SELECT
        ('payment:' || p."id") AS "id",
        'INCOME'::text AS "type",
        p."paymentDate" AS "date",
        ('INV-' || i."invoiceNumber"::text) AS "reference",
        'Invoice payment'::text AS "description",
        'Invoice payment'::text AS "category",
        'INVOICE_PAYMENT'::text AS "category_id",
        i."customerDisplayName" AS "party",
        p."paymentMethod"::text AS "payment_method",
        p."financialAccountId" AS "account_id",
        COALESCE(fa."name", 'Account not assigned') AS "account",
        p."amount" AS "amount",
        'COMPLETED'::text AS "status",
        i."createdById" AS "creator_id",
        u."name" AS "creator",
        p."referenceId" AS "reference_detail",
        NULL::text AS "attachment_url",
        ('/dashboard/invoices/' || i."id") AS "detail_url"
      FROM "InvoicePayment" p
      INNER JOIN "Invoice" i ON i."id" = p."invoiceId"
      LEFT JOIN "FinancialAccount" fa
        ON fa."id" = p."financialAccountId" AND fa."companyId" = ${companyId}
      LEFT JOIN "user" u ON u."id" = i."createdById"
      WHERE i."deletedAt" IS NULL AND i."status" <> 'VOID'

      UNION ALL

      SELECT
        ('expense:' || e."id") AS "id",
        'EXPENSE'::text AS "type",
        e."expenseDate" AS "date",
        e."transactionNumber" AS "reference",
        e."description" AS "description",
        c."name" AS "category",
        e."categoryId" AS "category_id",
        COALESCE(cu."displayName", e."vendorName") AS "party",
        e."paymentMethod"::text AS "payment_method",
        e."financialAccountId" AS "account_id",
        fa."name" AS "account",
        e."amount" AS "amount",
        e."status"::text AS "status",
        e."createdById" AS "creator_id",
        u."name" AS "creator",
        e."referenceNumber" AS "reference_detail",
        e."receiptUrl" AS "attachment_url",
        ('/dashboard/finance/expenses/' || e."id") AS "detail_url"
      FROM "Expense" e
      INNER JOIN "FinancialAccount" fa ON fa."id" = e."financialAccountId"
      INNER JOIN "ExpenseCategory" c ON c."id" = e."categoryId"
      LEFT JOIN "Customer" cu ON cu."id" = e."customerId"
      LEFT JOIN "user" u ON u."id" = e."createdById"
      WHERE e."deletedAt" IS NULL AND fa."companyId" = ${companyId}
    `;
    const filtered = Prisma.sql`
      WITH transactions AS (${transactionRows})
      SELECT * FROM transactions
      WHERE ${Prisma.join(conditions, " AND ")}
    `;
    const orderColumn = filters.sort === "amount"
      ? Prisma.raw('"amount"')
      : filters.sort === "description"
        ? Prisma.raw('"description"')
        : Prisma.raw('"date"');
    const orderDirection = filters.direction === "asc" ? Prisma.raw("ASC") : Prisma.raw("DESC");
    const offset = filters.page * filters.pageSize;

    const [rows, count, summary] = await Promise.all([
      prisma.$queryRaw<FinanceReportRow[]>(Prisma.sql`
        ${filtered}
        ORDER BY ${orderColumn} ${orderDirection}, "id" DESC
        LIMIT ${filters.pageSize} OFFSET ${offset}
      `),
      prisma.$queryRaw<Array<{ count: bigint }>>(Prisma.sql`
        SELECT COUNT(*)::bigint AS "count" FROM (${filtered}) AS report_rows
      `),
      prisma.$queryRaw<Array<{ income: Prisma.Decimal | null; expenses: Prisma.Decimal | null }>>(Prisma.sql`
        SELECT
          COALESCE(SUM(CASE WHEN "type" = 'INCOME' THEN "amount" ELSE 0 END), 0) AS "income",
          COALESCE(SUM(CASE WHEN "type" = 'EXPENSE' AND "status" = 'COMPLETED' THEN "amount" ELSE 0 END), 0) AS "expenses"
        FROM (${filtered}) AS report_rows
      `),
    ]);

    const totalCount = Number(count[0]?.count ?? BigInt(0));
    const income = numberValue(summary[0]?.income);
    const expenses = numberValue(summary[0]?.expenses);

    return successResponse("Finance report retrieved successfully", {
      rows: rows.map((row) => ({
        ...row,
        date: row.date.toISOString(),
        amount: numberValue(row.amount),
      })),
      totalCount,
      page: filters.page,
      pageSize: filters.pageSize,
      totalPages: Math.ceil(totalCount / filters.pageSize),
      income,
      expenses,
      netCashFlow: income - expenses,
      startDate: formatInIST(startDate, "yyyy-MM-dd"),
      endDate: formatInIST(new Date(endExclusive.getTime() - 1), "yyyy-MM-dd"),
    });
  } catch (error) {
    console.error("Failed to fetch finance report:", error);
    return errorResponse("Failed to fetch finance report", error);
  }
}

export async function getFinanceOverview(period: string = "month", startDate?: string | null, endDate?: string | null) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return errorResponse("Unauthorized");
    }

    const hasPermission = await checkFinancePermission("read");
    if (!hasPermission) {
      return errorResponse("You do not have permission to view finance overview");
    }

    const transactionRange = buildDateRange(period, startDate, endDate);
    const company = await prisma.company.findFirst({ select: { id: true } });
    if (!company) {
      return errorResponse("Create the company profile before viewing finance overview");
    }

    const [receivedIncome, completedExpenses, pendingExpenses, totalAccountBalance, outstandingReceivables, expenseByCategory] = await Promise.all([
      prisma.invoicePayment.aggregate({
        where: {
          invoice: {
            deletedAt: null,
            status: { not: "VOID" },
          },
          paymentDate: {
            gte: transactionRange.gte,
            lte: transactionRange.lte,
          },
        },
        _sum: { amount: true },
      }),
      prisma.expense.aggregate({
        where: {
          deletedAt: null,
          status: "COMPLETED",
          financialAccount: { companyId: company.id },
          expenseDate: {
            gte: transactionRange.gte,
            lte: transactionRange.lte,
          },
        },
        _sum: { amount: true },
      }),
      prisma.expense.aggregate({
        where: {
          deletedAt: null,
          status: "PENDING",
          financialAccount: { companyId: company.id },
        },
        _sum: { amount: true },
      }),
      prisma.financialAccount.findMany({
        where: { companyId: company.id, isActive: true },
        select: {
          id: true,
          name: true,
          type: true,
          openingBalance: true,
          openingBalanceDate: true,
          isActive: true,
          invoicePayments: {
            where: {
              invoice: {
                deletedAt: null,
                status: { not: "VOID" },
              },
              paymentDate: {
                gte: new Date(0),
              },
            },
            select: { amount: true, paymentDate: true },
          },
          expenses: {
            where: {
              deletedAt: null,
              status: "COMPLETED",
              financialAccount: { companyId: company.id },
              expenseDate: {
                gte: new Date(0),
              },
            },
            select: { amount: true, expenseDate: true },
          },
        },
      }),
      prisma.invoice.findMany({
        where: {
          deletedAt: null,
          status: { notIn: ["VOID", "DRAFT"] },
        },
        select: {
          id: true,
          invoiceNumber: true,
          customerDisplayName: true,
          status: true,
          dueDate: true,
          grandTotal: true,
          payments: {
            select: { amount: true },
          },
        },
        orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { invoiceNumber: "desc" }],
      }),
      prisma.expense.groupBy({
        by: ["categoryId"],
        where: {
          deletedAt: null,
          status: "COMPLETED",
          expenseDate: {
            gte: transactionRange.gte,
            lte: transactionRange.lte,
          },
        },
        _sum: { amount: true },
      }),
    ]);

    const currentTotalAccountBalance = totalAccountBalance.reduce((total, account) => {
      const openingBalance = numberValue(account.openingBalance);
      const received = account.invoicePayments.reduce((sum, payment) => {
        if (account.openingBalanceDate && payment.paymentDate < account.openingBalanceDate) {
          return sum;
        }
        return sum + numberValue(payment.amount);
      }, 0);
      const paid = account.expenses.reduce((sum, expense) => {
        if (account.openingBalanceDate && expense.expenseDate < account.openingBalanceDate) {
          return sum;
        }
        return sum + numberValue(expense.amount);
      }, 0);

      return total + openingBalance + received - paid;
    }, 0);

    const pendingInvoices = outstandingReceivables
      .map((invoice) => {
      const paymentsReceived = invoice.payments.reduce((paymentTotal, payment) => {
        return paymentTotal + numberValue(payment.amount);
      }, 0);
        return {
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          customerDisplayName: invoice.customerDisplayName,
          status: invoice.status,
          dueDate: invoice.dueDate?.toISOString() ?? null,
          amountDue: Math.max(0, numberValue(invoice.grandTotal) - paymentsReceived),
        };
      })
      .filter((invoice) => invoice.amountDue > 0);
    const outstandingReceivableTotal = pendingInvoices.reduce((sum, invoice) => sum + invoice.amountDue, 0);

    const totalReceivedIncome = numberValue(receivedIncome._sum.amount);
    const totalCompletedExpenses = numberValue(completedExpenses._sum.amount);
    const pendingExpenseTotal = numberValue(pendingExpenses._sum.amount);

    return successResponse("Finance overview retrieved successfully", {
      period,
      startDate: startDate ?? formatInIST(transactionRange.gte, "yyyy-MM-dd"),
      endDate: endDate ?? formatInIST(transactionRange.lte, "yyyy-MM-dd"),
      receivedIncome: totalReceivedIncome,
      completedExpenses: totalCompletedExpenses,
      netCashFlow: totalReceivedIncome - totalCompletedExpenses,
      currentTotalAccountBalance: currentTotalAccountBalance,
      pendingExpenses: pendingExpenseTotal,
      outstandingReceivables: outstandingReceivableTotal,
      pendingInvoices: pendingInvoices.slice(0, 10),
      pendingInvoiceCount: pendingInvoices.length,
      expenseByCategory: expenseByCategory.map((entry) => ({
        categoryId: entry.categoryId,
        amount: numberValue(entry._sum.amount),
      })),
    });
  } catch (error) {
    return errorResponse("Failed to fetch finance overview", error);
  }
}

type ExpenseListItem = Omit<
  Prisma.ExpenseGetPayload<{
    include: {
      category: true;
      financialAccount: true;
      customer: { select: { id: true; displayName: true; customerNumber: true } };
      createdBy: { select: { id: true; name: true; email: true } };
    };
  }>,
  "amount"
> & {
  amount: number;
};

type ExpenseListResponse = {
  items: Array<ExpenseListItem & { amount: number }>;
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export async function listExpenses({
  page = 0,
  pageSize = 20,
  status,
  search,
}: {
  page?: number;
  pageSize?: number;
  status?: string | null;
  search?: string | null;
} = {}) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return errorResponse("Unauthorized");
    }

    const hasPermission = await checkFinancePermission("read");
    if (!hasPermission) {
      return errorResponse("You do not have permission to view expenses");
    }

    const where: Prisma.ExpenseWhereInput = {
      deletedAt: null,
      ...(status ? { status: status as "PENDING" | "COMPLETED" | "CANCELLED" | "REVERSED" } : {}),
      ...(search
        ? {
            OR: [
              { description: { contains: search, mode: "insensitive" } },
              { vendorName: { contains: search, mode: "insensitive" } },
              { customer: { displayName: { contains: search, mode: "insensitive" } } },
              { referenceNumber: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [items, totalCount] = await Promise.all([
      prisma.expense.findMany({
        where,
        include: {
          category: true,
          financialAccount: true,
          customer: { select: { id: true, displayName: true, customerNumber: true } },
          createdBy: { select: { id: true, name: true, email: true } },
        },
        orderBy: { expenseDate: "desc" },
        skip: page * pageSize,
        take: pageSize,
      }),
      prisma.expense.count({ where }),
    ]);

    const response: ExpenseListResponse = {
      items: items.map((expense) => ({
        ...expense,
        amount: numberValue(expense.amount),
      })),
      totalCount,
      page,
      pageSize,
      totalPages: Math.ceil(totalCount / pageSize),
    };

    return successResponse<ExpenseListResponse>("Expenses retrieved successfully", response);
  } catch (error) {
    return errorResponse("Failed to fetch expenses", error);
  }
}

export async function createExpense(input: unknown) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return errorResponse("Unauthorized");
    }

    const hasPermission = await checkFinancePermission("create");
    if (!hasPermission) {
      return errorResponse("You do not have permission to create expenses");
    }

    const parsed = expenseSchema.safeParse(input);
    if (!parsed.success) {
      return errorResponse("Invalid expense payload", parsed.error.flatten());
    }

    const payload = parsed.data;
    const totals = calculateExpenseTotals(
      parseExpenseAmountCents(payload.amount),
      payload.taxRate,
      payload.taxInclusive,
    );
    if (totals.totalAmountCents > MAX_EXPENSE_TOTAL_CENTS) {
      return errorResponse("Total expense amount including tax exceeds the maximum allowed amount");
    }

    const company = await prisma.company.findFirst({ select: { id: true } });
    if (!company) {
      return errorResponse("Create the company profile before recording expenses");
    }

    const category = await prisma.expenseCategory.findUnique({ where: { id: payload.categoryId } });
    if (!category || !category.isActive) {
      return errorResponse("Selected expense category is unavailable");
    }

    const financialAccount = await prisma.financialAccount.findFirst({
      where: { id: payload.financialAccountId, companyId: company.id, isActive: true },
    });
    if (!financialAccount) {
      return errorResponse("Selected financial account is unavailable");
    }

    if (payload.customerId) {
      const customer = await prisma.customer.findFirst({
        where: { id: payload.customerId, deletedAt: null },
        select: { id: true },
      });
      if (!customer) {
        return errorResponse("Selected consumer is unavailable");
      }
    }

    const today = new Date();
    const transactionNumber = `EXP-${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, "0")}-${String(today.getUTCDate()).padStart(2, "0")}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    const expense = await prisma.$transaction(async (tx) => {
      const created = await tx.expense.create({
        data: {
        transactionNumber,
        description: payload.description,
        amount: new Prisma.Decimal((totals.totalAmountCents / 100).toFixed(2)),
        expenseDate: new Date(payload.expenseDate),
        paymentMethod: payload.paymentMethod,
        status: payload.status,
        referenceNumber: payload.referenceNumber,
        notes: payload.notes,
        receiptUrl: payload.receiptUrl || null,
        expenseType: payload.expenseType,
        sacCode: payload.sacCode || null,
        gstTreatment: payload.gstTreatment || null,
        sourceOfSupply: payload.sourceOfSupply || null,
        destinationOfSupply: payload.destinationOfSupply || null,
        reverseCharge: payload.reverseCharge,
        taxRate: payload.taxRate ?? null,
        taxInclusive: payload.taxInclusive,
        vendorName: payload.vendorName,
        customer: payload.customerId ? { connect: { id: payload.customerId } } : undefined,
        category: { connect: { id: payload.categoryId } },
        financialAccount: { connect: { id: payload.financialAccountId } },
          createdBy: { connect: { id: user.id } },
        },
      });
      await tx.expenseHistory.create({
        data: {
          expenseId: created.id,
          userId: user.id,
          action: "CREATED",
          details: JSON.stringify({ transactionNumber: created.transactionNumber, amount: created.amount.toString() }),
        },
      });
      return created;
    });

    revalidatePath("/dashboard/finance");
    return successResponse("Expense created successfully", {
      id: expense.id,
      transactionNumber: expense.transactionNumber,
    });
  } catch (error) {
    console.error("Failed to create finance expense:", error);
    return errorResponse("Failed to create expense", error);
  }
}

export async function updateExpense(id: string, input: unknown) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return errorResponse("Unauthorized");
    }

    const hasPermission = await checkFinancePermission("update");
    if (!hasPermission) {
      return errorResponse("You do not have permission to update expenses");
    }

    const parsed = expenseSchema.safeParse(input);
    if (!parsed.success) {
      return errorResponse("Invalid expense payload", parsed.error.flatten());
    }

    const payload = parsed.data;
    const totals = calculateExpenseTotals(
      parseExpenseAmountCents(payload.amount),
      payload.taxRate,
      payload.taxInclusive,
    );
    if (totals.totalAmountCents > MAX_EXPENSE_TOTAL_CENTS) {
      return errorResponse("Total expense amount including tax exceeds the maximum allowed amount");
    }
    const company = await prisma.company.findFirst({ select: { id: true } });
    if (!company) {
      return errorResponse("Company profile must exist before updating expenses");
    }

    const existing = await prisma.expense.findFirst({
      where: { id, deletedAt: null, financialAccount: { companyId: company.id } },
      select: { id: true },
    });
    if (!existing) {
      return errorResponse("Expense not found");
    }

    const [category, financialAccount] = await Promise.all([
      prisma.expenseCategory.findUnique({ where: { id: payload.categoryId } }),
      prisma.financialAccount.findFirst({
        where: { id: payload.financialAccountId, companyId: company.id, isActive: true },
      }),
    ]);
    if (!category || !category.isActive) {
      return errorResponse("Selected expense category is unavailable");
    }
    if (!financialAccount) {
      return errorResponse("Selected financial account is unavailable");
    }

    if (payload.customerId) {
      const customer = await prisma.customer.findFirst({
        where: { id: payload.customerId, deletedAt: null },
        select: { id: true },
      });
      if (!customer) {
        return errorResponse("Selected consumer is unavailable");
      }
    }

    const expense = await prisma.$transaction(async (tx) => {
      const updated = await tx.expense.update({
      where: { id },
      data: {
        description: payload.description,
        amount: new Prisma.Decimal((totals.totalAmountCents / 100).toFixed(2)),
        expenseDate: new Date(payload.expenseDate),
        paymentMethod: payload.paymentMethod,
        status: payload.status,
        referenceNumber: payload.referenceNumber,
        notes: payload.notes,
        receiptUrl: payload.receiptUrl || null,
        vendorName: payload.vendorName,
        customer: payload.customerId
          ? { connect: { id: payload.customerId } }
          : { disconnect: true },
        category: { connect: { id: payload.categoryId } },
        financialAccount: { connect: { id: payload.financialAccountId } },
        expenseType: payload.expenseType,
        sacCode: payload.sacCode || null,
        gstTreatment: payload.gstTreatment || null,
        sourceOfSupply: payload.sourceOfSupply,
        destinationOfSupply: payload.destinationOfSupply,
        reverseCharge: payload.reverseCharge,
        taxRate: payload.taxRate ?? null,
        taxInclusive: payload.taxInclusive,
      },
      });
      await tx.expenseHistory.create({
        data: {
          expenseId: id,
          userId: user.id,
          action: "UPDATED",
          details: JSON.stringify({ amount: payload.amount, status: payload.status, financialAccountId: payload.financialAccountId }),
        },
      });
      return updated;
    });

    revalidatePath("/dashboard/finance");
    revalidatePath(`/dashboard/finance/expenses/${id}`);
    revalidatePath(`/dashboard/finance/expenses/${id}/edit`);
    return successResponse("Expense updated successfully", expense);
  } catch (error) {
    return errorResponse("Failed to update expense", error);
  }
}

export async function getExpense(id: string) {
    try {
      const user = await getSessionUser();
      if (!user) return errorResponse("Unauthorized");
      const hasPermission = await checkFinancePermission("read");
      if (!hasPermission) return errorResponse("You do not have permission to view expenses");

      const company = await prisma.company.findFirst({ select: { id: true } });
      if (!company) return errorResponse("Company profile not found");

      const expense = await prisma.expense.findFirst({
        where: { id, deletedAt: null, financialAccount: { companyId: company.id } },
        include: {
          category: { select: { id: true, name: true, isActive: true } },
          customer: { select: { id: true, companyName: true, primaryContactName: true } },
          history: { include: { user: { select: { id: true, name: true } } }, orderBy: { createdAt: "desc" } },
        },
      });
      if (!expense) return errorResponse("Expense not found");
      return successResponse("Expense loaded successfully", expense);
    } catch (error) {
      return errorResponse("Failed to load expense", error);
    }
  }

export async function deleteExpense(id: string) {
    try {
      const user = await getSessionUser();
      if (!user) return errorResponse("Unauthorized");
      const hasPermission = await checkFinancePermission("delete");
      if (!hasPermission) return errorResponse("You do not have permission to delete expenses");

      const company = await prisma.company.findFirst({ select: { id: true } });
      if (!company) return errorResponse("Company profile not found");

      const existing = await prisma.expense.findFirst({
        where: { id, deletedAt: null, financialAccount: { companyId: company.id } },
        include: { category: { select: { name: true } } },
      });
      if (!existing) return errorResponse("Expense not found");

      await prisma.$transaction([
        prisma.expenseHistory.create({
          data: {
            expenseId: id,
            userId: user.id,
            action: "DELETED",
            details: JSON.stringify({ transactionNumber: existing.transactionNumber, amount: existing.amount.toString() }),
          },
        }),
        prisma.expense.update({
          where: { id },
          data: { deletedAt: new Date() },
        }),
      ]);

      revalidatePath("/dashboard/finance");
      revalidatePath(`/dashboard/finance/expenses/${id}`);
      revalidatePath(`/dashboard/finance/expenses/${id}/edit`);
      return successResponse("Expense deleted successfully");
    } catch (error) {
      return errorResponse("Failed to delete expense", error);
    }
}

export async function createFinancialAccount(input: unknown) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return errorResponse("Unauthorized");
    }

    const hasPermission = await checkFinancePermission("create");
    if (!hasPermission) {
      return errorResponse("You do not have permission to create financial accounts");
    }

    const parsed = financialAccountSchema.safeParse(input);
    if (!parsed.success) {
      return errorResponse("Invalid financial account payload", parsed.error.flatten());
    }

    const company = await prisma.company.findFirst();
    if (!company) {
      return errorResponse("Company profile must exist before creating a financial account");
    }

    const account = await prisma.financialAccount.create({
      data: {
        companyId: company.id,
        name: parsed.data.name,
        type: parsed.data.type,
        companyBankAccountId: parsed.data.companyBankAccountId ?? null,
        openingBalance: parsed.data.openingBalance,
        openingBalanceDate: parsed.data.openingBalanceDate ? new Date(parsed.data.openingBalanceDate) : null,
        isActive: parsed.data.isActive,
      },
    });

    return successResponse("Financial account created successfully", account);
  } catch (error) {
    return errorResponse("Failed to create financial account", error);
  }
}

export async function createExpenseCategory(input: unknown) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return errorResponse("Unauthorized");
    }

    const hasPermission = await checkFinancePermission("create");
    if (!hasPermission) {
      return errorResponse("You do not have permission to create expense categories");
    }

    const parsed = expenseCategorySchema.safeParse(input);
    if (!parsed.success) {
      return errorResponse("Invalid expense category payload", parsed.error.flatten());
    }

    const category = await prisma.expenseCategory.create({
      data: {
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        isActive: parsed.data.isActive,
      },
    });

    return successResponse("Expense category created successfully", category);
  } catch (error) {
    return errorResponse("Failed to create expense category", error);
  }
}
