"use server";

import { Prisma } from "@/app/generated/prisma/client";
import { ExpenseStatus, InvoiceStatus, ProposalStatus } from "@/app/generated/prisma/enums";
import { auth } from "@/lib/auth";
import { errorResponse, successResponse } from "@/lib/action-response";
import prisma from "@/lib/prisma";
import { headers } from "next/headers";
import { z } from "zod";
import type { ReportId } from "@/lib/reports/report-catalog";

const reportInputSchema = z.object({
  reportId: z.enum([
    "sales-by-customer",
    "sales-by-item",
    "sales-by-salesperson",
    "receivables-aging",
    "receivable-details",
    "invoice-details",
    "customer-balances",
    "payments-received",
    "time-to-get-paid",
    "expenses-by-category",
    "expenses-by-vendor",
    "customer-activity",
    "proposal-details",
    "proposal-items",
    "customer-retention",
  ]),
  startDate: z.union([z.literal(""), z.iso.date()]).default(""),
  endDate: z.union([z.literal(""), z.iso.date()]).default(""),
  search: z.string().trim().max(120).default(""),
  status: z.enum([
    "ALL",
    "DRAFT",
    "SENT",
    "PARTIALLY_PAID",
    "PAID",
    "OVERDUE",
    "VOID",
    "PENDING",
    "COMPLETED",
    "CANCELLED",
    "REVERSED",
    "ACCEPTED",
    "REJECTED",
    "EXPIRED",
  ]).default("ALL"),
  page: z.number().int().min(0).default(0),
  pageSize: z.number().int().min(1).max(100).default(20),
}).refine((input) => !input.startDate || !input.endDate || input.endDate >= input.startDate, {
  message: "End date must be on or after start date",
  path: ["endDate"],
});

type ReportRow = { id: string; [key: string]: string | number | null };
type ReportSummary = { label: string; value: number | string };

const maxReportRows = 5000;

function amountInInr(amount: number, currency: string, exchangeRate: number | null) {
  return amount * (currency === "INR" ? 1 : exchangeRate ?? 83.5);
}

function dateValue(date: Date | null) {
  return date?.toISOString().slice(0, 10) ?? "—";
}

function cleanSearch(value: string | number | null) {
  return String(value ?? "").toLocaleLowerCase();
}

async function hasPermission(permission: "finance" | "customers" | "invoices" | "proposals") {
  const requestHeaders = await headers();
  const result = permission === "finance"
    ? await auth.api.userHasPermission({ headers: requestHeaders, body: { permissions: { finance: ["read"] } } })
    : permission === "customers"
      ? await auth.api.userHasPermission({ headers: requestHeaders, body: { permissions: { customers: ["read"] } } })
      : permission === "invoices"
        ? await auth.api.userHasPermission({ headers: requestHeaders, body: { permissions: { invoices: ["read"] } } })
        : await auth.api.userHasPermission({ headers: requestHeaders, body: { permissions: { proposals: ["read"] } } });
  return result.success;
}

async function canReadReport(reportId: ReportId) {
  if (reportId === "customer-activity") return hasPermission("customers");
  if (reportId === "proposal-details" || reportId === "proposal-items") return hasPermission("proposals");
  if (reportId === "customer-retention") {
    const results = await Promise.all([
      hasPermission("customers"),
      hasPermission("invoices"),
      hasPermission("proposals"),
    ]);
    return results.every(Boolean);
  }
  const results = await Promise.all([
    hasPermission("finance"),
    hasPermission("invoices"),
  ]);
  return results.every(Boolean);
}

export async function getBusinessReport(input: unknown) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) return errorResponse("Unauthorized");

    const parsed = reportInputSchema.safeParse(input);
    if (!parsed.success) return errorResponse("Invalid report filters", parsed.error.flatten());
    const filters = parsed.data;

    if (!(await canReadReport(filters.reportId))) {
      return errorResponse("You do not have permission to view this report");
    }

    const now = new Date();
    const startDate = filters.startDate
      ? new Date(`${filters.startDate}T00:00:00.000Z`)
      : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const endExclusive = filters.endDate
      ? new Date(`${filters.endDate}T00:00:00.000Z`)
      : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
    if (filters.endDate) endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);
    if (endExclusive <= startDate) return errorResponse("End date must be on or after start date");

    const invoiceStatuses = Object.values(InvoiceStatus) as string[];
    const issuedInvoiceWhere: Prisma.InvoiceWhereInput = {
      issueDate: { gte: startDate, lt: endExclusive },
      deletedAt: null,
      status: { notIn: ["DRAFT", "VOID"] },
    };
    let rows: ReportRow[] = [];
    let summary: ReportSummary[] = [];

    switch (filters.reportId) {
      case "sales-by-customer": {
        const invoices = await prisma.invoice.findMany({
          where: issuedInvoiceWhere,
          take: maxReportRows + 1,
          select: {
            id: true,
            customerId: true,
            customerDisplayName: true,
            customerCompanyName: true,
            subtotal: true,
            grandTotal: true,
            currency: true,
            exchangeRate: true,
          },
        });
        if (invoices.length > maxReportRows) return errorResponse("This report has more than 5,000 invoices. Narrow the date range and try again.");
        const grouped = new Map<string, { name: string; count: number; sales: number; total: number }>();
        for (const invoice of invoices) {
          const entry = grouped.get(invoice.customerId) ?? {
            name: invoice.customerCompanyName || invoice.customerDisplayName,
            count: 0,
            sales: 0,
            total: 0,
          };
          entry.count += 1;
          entry.sales += amountInInr(invoice.subtotal.toNumber(), invoice.currency, invoice.exchangeRate?.toNumber() ?? null);
          entry.total += amountInInr(invoice.grandTotal.toNumber(), invoice.currency, invoice.exchangeRate?.toNumber() ?? null);
          grouped.set(invoice.customerId, entry);
        }
        rows = [...grouped].map(([id, value]) => ({
          id,
          customer: value.name,
          invoiceCount: value.count,
          sales: value.sales,
          salesWithTax: value.total,
        }));
        summary = [
          { label: "Customers", value: rows.length },
          { label: "Sales", value: rows.reduce((sum, row) => sum + Number(row.sales), 0) },
          { label: "Sales with tax", value: rows.reduce((sum, row) => sum + Number(row.salesWithTax), 0) },
        ];
        break;
      }
      case "sales-by-item": {
        const lineItems = await prisma.invoiceLineItem.findMany({
          where: { invoice: issuedInvoiceWhere },
          take: maxReportRows + 1,
          select: {
            id: true,
            name: true,
            quantity: true,
            total: true,
            invoiceId: true,
          },
        });
        if (lineItems.length > maxReportRows) return errorResponse("This report has more than 5,000 invoice items. Narrow the date range and try again.");
        const invoices = await prisma.invoice.findMany({
          where: { id: { in: [...new Set(lineItems.map((item) => item.invoiceId))] } },
          select: { id: true, currency: true, exchangeRate: true },
        });
        const invoiceCurrency = new Map(invoices.map((invoice) => [
          invoice.id,
          { currency: invoice.currency, exchangeRate: invoice.exchangeRate?.toNumber() ?? null },
        ]));
        const grouped = new Map<string, { quantity: number; sales: number; invoices: Set<string> }>();
        for (const item of lineItems) {
          const entry = grouped.get(item.name) ?? { quantity: 0, sales: 0, invoices: new Set<string>() };
          entry.quantity += item.quantity;
          const currency = invoiceCurrency.get(item.invoiceId);
          entry.sales += amountInInr(item.total.toNumber(), currency?.currency ?? "INR", currency?.exchangeRate ?? null);
          entry.invoices.add(item.invoiceId);
          grouped.set(item.name, entry);
        }
        rows = [...grouped].map(([item, value]) => ({
          id: item,
          item,
          quantity: value.quantity,
          invoiceCount: value.invoices.size,
          sales: value.sales,
        }));
        summary = [
          { label: "Items / services", value: rows.length },
          { label: "Sales", value: rows.reduce((sum, row) => sum + Number(row.sales), 0) },
        ];
        break;
      }
      case "sales-by-salesperson": {
        const invoices = await prisma.invoice.findMany({
          where: issuedInvoiceWhere,
          take: maxReportRows + 1,
          select: {
            id: true,
            createdById: true,
            createdBy: { select: { name: true } },
            grandTotal: true,
            currency: true,
            exchangeRate: true,
          },
        });
        if (invoices.length > maxReportRows) return errorResponse("This report has more than 5,000 invoices. Narrow the date range and try again.");
        const grouped = new Map<string, { name: string; count: number; sales: number }>();
        for (const invoice of invoices) {
          const key = invoice.createdById;
          const entry = grouped.get(key) ?? { name: invoice.createdBy.name, count: 0, sales: 0 };
          entry.count += 1;
          entry.sales += amountInInr(invoice.grandTotal.toNumber(), invoice.currency, invoice.exchangeRate?.toNumber() ?? null);
          grouped.set(key, entry);
        }
        rows = [...grouped].map(([id, value]) => ({
          id,
          salesperson: value.name,
          invoiceCount: value.count,
          sales: value.sales,
        }));
        summary = [
          { label: "Salespeople", value: rows.length },
          { label: "Sales", value: rows.reduce((sum, row) => sum + Number(row.sales), 0) },
        ];
        break;
      }
      case "receivables-aging":
      case "receivable-details": {
        const invoices = await prisma.invoice.findMany({
          where: {
            dueDate: { gte: startDate, lt: endExclusive },
            deletedAt: null,
            status: { in: ["SENT", "PARTIALLY_PAID", "OVERDUE"] },
            amountPaid: { lt: prisma.invoice.fields.grandTotal },
          },
          take: maxReportRows + 1,
          select: {
            id: true,
            invoiceNumber: true,
            customerDisplayName: true,
            dueDate: true,
            grandTotal: true,
            amountPaid: true,
            currency: true,
            exchangeRate: true,
          },
          orderBy: { dueDate: "asc" },
        });
        if (invoices.length > maxReportRows) return errorResponse("This report has more than 5,000 open invoices. Narrow the date range and try again.");
        const buckets = [
          { label: "Current", min: 0, max: 0 },
          { label: "1–15 days overdue", min: 1, max: 15 },
          { label: "16–30 days overdue", min: 16, max: 30 },
          { label: "31–45 days overdue", min: 31, max: 45 },
          { label: "Over 45 days overdue", min: 46, max: Number.POSITIVE_INFINITY },
        ];
        const grouped = new Map(buckets.map((bucket) => [bucket.label, { count: 0, amount: 0 }]));
        rows = invoices.map((invoice) => {
          const outstanding = amountInInr(
            Math.max(0, invoice.grandTotal.toNumber() - invoice.amountPaid.toNumber()),
            invoice.currency,
            invoice.exchangeRate?.toNumber() ?? null,
          );
          const daysLate = invoice.dueDate
            ? Math.max(0, Math.floor((Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - Date.UTC(invoice.dueDate.getUTCFullYear(), invoice.dueDate.getUTCMonth(), invoice.dueDate.getUTCDate())) / 86400000))
            : 0;
          const bucket = buckets.find((candidate) => daysLate >= candidate.min && daysLate <= candidate.max)?.label ?? buckets[0].label;
          const totals = grouped.get(bucket)!;
          totals.count += 1;
          totals.amount += outstanding;
          return {
            id: invoice.id,
            invoice: `INV-${invoice.invoiceNumber}`,
            customer: invoice.customerDisplayName,
            dueDate: dateValue(invoice.dueDate),
            age: bucket,
            outstanding,
          };
        });
        if (filters.reportId === "receivables-aging") {
          rows = buckets.map((bucket) => ({
            id: bucket.label,
            age: bucket.label,
            invoiceCount: grouped.get(bucket.label)!.count,
            outstanding: grouped.get(bucket.label)!.amount,
          }));
        }
        summary = [
          { label: "Open invoices", value: invoices.length },
          { label: "Outstanding", value: invoices.reduce((sum, invoice) => sum + amountInInr(
            Math.max(0, invoice.grandTotal.toNumber() - invoice.amountPaid.toNumber()),
            invoice.currency,
            invoice.exchangeRate?.toNumber() ?? null,
          ), 0) },
        ];
        break;
      }
      case "invoice-details": {
        const invoices = await prisma.invoice.findMany({
          where: {
            issueDate: { gte: startDate, lt: endExclusive },
            deletedAt: null,
            ...(invoiceStatuses.includes(filters.status)
              ? { status: filters.status as InvoiceStatus }
              : {}),
          },
          take: maxReportRows + 1,
          orderBy: { issueDate: "desc" },
          select: {
            id: true, invoiceNumber: true, customerDisplayName: true, issueDate: true, dueDate: true,
            status: true, grandTotal: true, amountPaid: true, currency: true, exchangeRate: true,
          },
        });
        if (invoices.length > maxReportRows) return errorResponse("This report has more than 5,000 invoices. Narrow the date range and try again.");
        rows = invoices.map((invoice) => ({
          id: invoice.id,
          invoice: `INV-${invoice.invoiceNumber}`,
          customer: invoice.customerDisplayName,
          issueDate: dateValue(invoice.issueDate),
          dueDate: dateValue(invoice.dueDate),
          status: invoice.status,
          total: amountInInr(invoice.grandTotal.toNumber(), invoice.currency, invoice.exchangeRate?.toNumber() ?? null),
          paid: amountInInr(invoice.amountPaid.toNumber(), invoice.currency, invoice.exchangeRate?.toNumber() ?? null),
        }));
        summary = [
          { label: "Invoices", value: rows.length },
          { label: "Total invoiced", value: rows.reduce((sum, row) => sum + Number(row.total), 0) },
        ];
        break;
      }
      case "customer-balances": {
        const invoices = await prisma.invoice.findMany({
          where: issuedInvoiceWhere,
          take: maxReportRows + 1,
          select: {
            customerId: true,
            customerDisplayName: true,
            customerCompanyName: true,
            grandTotal: true,
            amountPaid: true,
            currency: true,
            exchangeRate: true,
          },
        });
        if (invoices.length > maxReportRows) return errorResponse("This report has more than 5,000 invoices. Narrow the date range and try again.");
        const balances = new Map<string, { customer: string; invoiceCount: number; sales: number; received: number }>();
        for (const invoice of invoices) {
          const balance = balances.get(invoice.customerId) ?? {
            customer: invoice.customerCompanyName || invoice.customerDisplayName,
            invoiceCount: 0,
            sales: 0,
            received: 0,
          };
          balance.invoiceCount += 1;
          balance.sales += amountInInr(invoice.grandTotal.toNumber(), invoice.currency, invoice.exchangeRate?.toNumber() ?? null);
          balance.received += amountInInr(invoice.amountPaid.toNumber(), invoice.currency, invoice.exchangeRate?.toNumber() ?? null);
          balances.set(invoice.customerId, balance);
        }
        rows = [...balances].map(([id, customer]) => {
          const sales = customer.sales;
          const received = customer.received;
          return {
            id,
            customer: customer.customer,
            invoiceCount: customer.invoiceCount,
            sales,
            received,
            outstanding: Math.max(0, sales - received),
          };
        });
        summary = [
          { label: "Customers", value: rows.length },
          { label: "Outstanding", value: rows.reduce((sum, row) => sum + Number(row.outstanding), 0) },
        ];
        break;
      }
      case "payments-received": {
        const payments = await prisma.invoicePayment.findMany({
          where: {
            paymentDate: { gte: startDate, lt: endExclusive },
            invoice: { deletedAt: null, status: { not: "VOID" } },
          },
          take: maxReportRows + 1,
          orderBy: { paymentDate: "desc" },
          select: {
            id: true, paymentDate: true, amount: true, paymentMethod: true, referenceId: true,
            invoice: { select: { invoiceNumber: true, customerDisplayName: true, currency: true, exchangeRate: true } },
          },
        });
        if (payments.length > maxReportRows) return errorResponse("This report has more than 5,000 payments. Narrow the date range and try again.");
        rows = payments.map((payment) => ({
          id: payment.id,
          date: dateValue(payment.paymentDate),
          reference: `INV-${payment.invoice.invoiceNumber}${payment.referenceId ? ` · ${payment.referenceId}` : ""}`,
          customer: payment.invoice.customerDisplayName,
          method: payment.paymentMethod.replaceAll("_", " "),
          amount: amountInInr(payment.amount.toNumber(), payment.invoice.currency, payment.invoice.exchangeRate?.toNumber() ?? null),
        }));
        summary = [
          { label: "Payments", value: rows.length },
          { label: "Received", value: rows.reduce((sum, row) => sum + Number(row.amount), 0) },
        ];
        break;
      }
      case "time-to-get-paid": {
        const payments = await prisma.invoicePayment.findMany({
          where: {
            invoice: issuedInvoiceWhere,
          },
          take: maxReportRows + 1,
          orderBy: [{ invoiceId: "asc" }, { paymentDate: "asc" }],
          select: {
            paymentDate: true,
            invoiceId: true,
            invoice: {
              select: {
                invoiceNumber: true,
                customerDisplayName: true,
                issueDate: true,
                currency: true,
                exchangeRate: true,
                amountPaid: true,
              },
            },
          },
        });
        if (payments.length > maxReportRows) return errorResponse("This report has more than 5,000 payments. Narrow the date range and try again.");
        const firstPayment = new Map<string, typeof payments[number]>();
        for (const payment of payments) {
          if (!firstPayment.has(payment.invoiceId)) firstPayment.set(payment.invoiceId, payment);
        }
        rows = [...firstPayment.values()].map((payment) => {
          const daysToPay = Math.max(0, Math.floor((payment.paymentDate.getTime() - payment.invoice.issueDate.getTime()) / 86400000));
          return {
            id: payment.invoiceId,
            invoice: `INV-${payment.invoice.invoiceNumber}`,
            customer: payment.invoice.customerDisplayName,
            issueDate: dateValue(payment.invoice.issueDate),
            firstPayment: dateValue(payment.paymentDate),
            daysToPay,
            received: amountInInr(payment.invoice.amountPaid.toNumber(), payment.invoice.currency, payment.invoice.exchangeRate?.toNumber() ?? null),
          };
        });
        summary = [
          { label: "Invoices paid at least once", value: rows.length },
          { label: "Average days to first payment", value: rows.length ? rows.reduce((sum, row) => sum + Number(row.daysToPay), 0) / rows.length : 0 },
        ];
        break;
      }
      case "expenses-by-category":
      case "expenses-by-vendor": {
        const expenses = await prisma.expense.findMany({
          where: {
            expenseDate: { gte: startDate, lt: endExclusive },
            deletedAt: null,
            ...(Object.values(ExpenseStatus).includes(filters.status as ExpenseStatus)
              ? { status: filters.status as ExpenseStatus }
              : {}),
          },
          take: maxReportRows + 1,
          select: {
            id: true, amount: true, currency: true, vendorName: true,
            category: { select: { name: true } },
          },
        });
        if (expenses.length > maxReportRows) return errorResponse("This report has more than 5,000 expenses. Narrow the date range and try again.");
        const grouped = new Map<string, { count: number; amount: number }>();
        for (const expense of expenses) {
          const label = filters.reportId === "expenses-by-category"
            ? expense.category.name
            : expense.vendorName || "Vendor not specified";
          const value = grouped.get(label) ?? { count: 0, amount: 0 };
          value.count += 1;
          value.amount += amountInInr(expense.amount.toNumber(), expense.currency, null);
          grouped.set(label, value);
        }
        rows = [...grouped].map(([label, value]) => ({
          id: label,
          ...(filters.reportId === "expenses-by-category" ? { category: label } : { vendor: label }),
          expenseCount: value.count,
          amount: value.amount,
        }));
        summary = [
          { label: "Expense records", value: expenses.length },
          { label: "Total", value: expenses.reduce((sum, expense) => sum + amountInInr(expense.amount.toNumber(), expense.currency, null), 0) },
        ];
        break;
      }
      case "customer-activity": {
        const customers = await prisma.customer.findMany({
          where: {
            deletedAt: null,
            createdAt: { gte: startDate, lt: endExclusive },
          },
          take: maxReportRows + 1,
          orderBy: { createdAt: "desc" },
          select: {
            id: true, displayName: true, companyName: true, createdAt: true,
            assignedTo: { select: { name: true } },
            _count: { select: { invoices: true, proposals: true } },
          },
        });
        if (customers.length > maxReportRows) return errorResponse("This report has more than 5,000 customers. Narrow the date range and try again.");
        rows = customers.map((customer) => ({
          id: customer.id,
          customer: customer.displayName,
          company: customer.companyName,
          created: dateValue(customer.createdAt),
          invoices: customer._count.invoices,
          proposals: customer._count.proposals,
          owner: customer.assignedTo?.name ?? "Unassigned",
        }));
        summary = [{ label: "New customers", value: rows.length }];
        break;
      }
      case "proposal-details":
      case "proposal-items": {
        const proposals = await prisma.proposal.findMany({
          where: {
            createdAt: { gte: startDate, lt: endExclusive },
            ...(Object.values(ProposalStatus).includes(filters.status as ProposalStatus)
              ? { status: filters.status as ProposalStatus }
              : {}),
          },
          take: maxReportRows + 1,
          orderBy: { createdAt: "desc" },
          select: {
            id: true, proposalNumber: true, title: true, customerDisplayName: true,
            status: true, preparedByName: true, validUntil: true, grandTotal: true,
            currency: true, exchangeRate: true,
            proposalServices: {
              select: {
                serviceName: true, packageName: true,
                items: { select: { id: true, name: true, quantity: true, total: true } },
              },
            },
          },
        });
        if (proposals.length > maxReportRows) return errorResponse("This report has more than 5,000 quotes. Narrow the date range and try again.");
        if (filters.reportId === "proposal-details") {
          rows = proposals.map((proposal) => ({
            id: proposal.id,
            proposal: `QT-${proposal.proposalNumber}`,
            title: proposal.title,
            customer: proposal.customerDisplayName,
            status: proposal.status,
            preparedBy: proposal.preparedByName,
            validUntil: dateValue(proposal.validUntil),
            total: amountInInr(proposal.grandTotal.toNumber(), proposal.currency, proposal.exchangeRate?.toNumber() ?? null),
          }));
        } else {
          rows = proposals.flatMap((proposal) => proposal.proposalServices.flatMap((service) =>
            service.items.map((item) => ({
              id: item.id,
              proposal: `QT-${proposal.proposalNumber}`,
              customer: proposal.customerDisplayName,
              item: service.packageName
                ? `${service.packageName} (${service.serviceName}) · ${item.name}`
                : `${service.serviceName} · ${item.name}`,
              quantity: item.quantity,
              total: amountInInr(item.total.toNumber(), proposal.currency, proposal.exchangeRate?.toNumber() ?? null),
            }))
          ));
          if (rows.length > maxReportRows) return errorResponse("This report has more than 5,000 quote items. Narrow the date range and try again.");
        }
        summary = [
          { label: "Quotes", value: proposals.length },
          { label: "Quoted total", value: proposals.reduce((sum, proposal) => sum + amountInInr(proposal.grandTotal.toNumber(), proposal.currency, proposal.exchangeRate?.toNumber() ?? null), 0) },
        ];
        break;
      }
      case "customer-retention": {
        const customers = await prisma.customer.findMany({
          where: { deletedAt: null, createdAt: { gte: startDate, lt: endExclusive } },
          take: maxReportRows + 1,
          orderBy: { displayName: "asc" },
          select: {
            id: true, displayName: true, companyName: true, createdAt: true,
            invoices: {
              where: { issueDate: { lt: endExclusive }, deletedAt: null },
              orderBy: { issueDate: "desc" },
              take: 1,
              select: { issueDate: true },
            },
            proposals: {
              where: { createdAt: { lt: endExclusive } },
              orderBy: { createdAt: "desc" },
              take: 1,
              select: { createdAt: true },
            },
            _count: {
              select: {
                invoices: { where: { issueDate: { lt: endExclusive }, deletedAt: null } },
                proposals: { where: { createdAt: { lt: endExclusive } } },
              },
            },
          },
        });
        if (customers.length > maxReportRows) return errorResponse("This report has more than 5,000 customers. Narrow the date range and try again.");
        const retentionCutoff = new Date(endExclusive);
        retentionCutoff.setUTCDate(retentionCutoff.getUTCDate() - 91);
        rows = customers.map((customer) => {
          const invoiceActivity = customer.invoices[0]?.issueDate ?? null;
          const proposalActivity = customer.proposals[0]?.createdAt ?? null;
          const lastActivity = [invoiceActivity, proposalActivity].filter((date): date is Date => date !== null)
            .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;
          const segment = customer._count.invoices > 1
            ? "Repeat customer"
            : !lastActivity || lastActivity < retentionCutoff
              ? "Inactive (90+ days)"
              : "Active";
          return {
            id: customer.id,
            customer: customer.companyName || customer.displayName,
            segment,
            invoiceCount: customer._count.invoices,
            proposalCount: customer._count.proposals,
            lastActivity: dateValue(lastActivity),
          };
        });
        summary = [
          { label: "Customers", value: rows.length },
          { label: "Repeat customers", value: rows.filter((row) => row.segment === "Repeat customer").length },
          { label: "Inactive 90+ days", value: rows.filter((row) => row.segment === "Inactive (90+ days)").length },
        ];
        break;
      }
    }

    const needle = filters.search.toLocaleLowerCase();
    const searchedRows = needle
      ? rows.filter((row) => Object.values(row).some((value) => cleanSearch(value).includes(needle)))
      : rows;
    const sortedRows = searchedRows.sort((a, b) => String(a[Object.keys(a)[1]] ?? "").localeCompare(String(b[Object.keys(b)[1]] ?? "")));
    const totalCount = sortedRows.length;
    const pageRows = sortedRows.slice(filters.page * filters.pageSize, (filters.page + 1) * filters.pageSize);

    return successResponse("Report loaded", {
      rows: pageRows,
      summary,
      totalCount,
      page: filters.page,
      pageSize: filters.pageSize,
      totalPages: Math.ceil(totalCount / filters.pageSize),
      startDate: startDate.toISOString().slice(0, 10),
      endDate: new Date(endExclusive.getTime() - 86400000).toISOString().slice(0, 10),
    });
  } catch (error) {
    console.error("Failed to load business report:", error);
    return errorResponse("Failed to load report data");
  }
}
