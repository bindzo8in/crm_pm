import { z } from "zod";

export const receivableAgeSchema = z.enum([
  "ALL",
  "CURRENT",
  "DAYS_1_15",
  "DAYS_16_30",
  "DAYS_31_45",
  "OVER_45",
]);
export type ReceivableAge = z.infer<typeof receivableAgeSchema>;
export type ReceivableAgeFilter = Exclude<ReceivableAge, "ALL">;

export const receivableAgeOptions: Array<{ value: ReceivableAge; label: string }> = [
  { value: "ALL", label: "All outstanding invoices" },
  { value: "CURRENT", label: "Current" },
  { value: "DAYS_1_15", label: "1–15 days overdue" },
  { value: "DAYS_16_30", label: "16–30 days overdue" },
  { value: "DAYS_31_45", label: "31–45 days overdue" },
  { value: "OVER_45", label: "Over 45 days overdue" },
];

export type ReportId =
  | "sales-by-customer"
  | "sales-by-item"
  | "sales-by-salesperson"
  | "receivables-aging"
  | "receivable-details"
  | "invoice-details"
  | "customer-balances"
  | "payments-received"
  | "time-to-get-paid"
  | "expenses-by-category"
  | "expenses-by-vendor"
  | "customer-activity"
  | "proposal-details"
  | "proposal-items"
  | "customer-retention";

export type ReportGroup = "Sales" | "Receivables" | "Payments received" | "Expenses" | "Customers" | "Proposals / quotes" | "Retention";

export type ReportDefinition = {
  id: ReportId;
  group: ReportGroup;
  title: string;
  description: string;
  columns: Array<{ key: string; label: string; align?: "right" }>;
  permission: "finance" | "customers" | "proposals" | "retention";
};

export const reportCatalog: ReportDefinition[] = [
  {
    id: "sales-by-customer",
    group: "Sales",
    title: "Sales by Customer",
    description: "Invoice count and sales totals for each customer.",
    columns: [
      { key: "customer", label: "Customer" },
      { key: "invoiceCount", label: "Invoice count", align: "right" },
      { key: "sales", label: "Sales", align: "right" },
      { key: "salesWithTax", label: "Sales with tax", align: "right" },
    ],
    permission: "finance",
  },
  {
    id: "sales-by-item",
    group: "Sales",
    title: "Sales by Item",
    description: "Quantity and invoiced totals for each service or item.",
    columns: [
      { key: "item", label: "Item / service" },
      { key: "quantity", label: "Quantity", align: "right" },
      { key: "invoiceCount", label: "Invoice count", align: "right" },
      { key: "sales", label: "Sales", align: "right" },
    ],
    permission: "finance",
  },
  {
    id: "sales-by-salesperson",
    group: "Sales",
    title: "Sales by Salesperson",
    description: "Invoiced sales totals by invoice creator.",
    columns: [
      { key: "salesperson", label: "Salesperson" },
      { key: "invoiceCount", label: "Invoice count", align: "right" },
      { key: "sales", label: "Sales", align: "right" },
    ],
    permission: "finance",
  },
  {
    id: "receivables-aging",
    group: "Receivables",
    title: "AR Aging Summary",
    description: "Outstanding invoice balances grouped by overdue age.",
    columns: [
      { key: "age", label: "Age" },
      { key: "invoiceCount", label: "Invoices", align: "right" },
      { key: "outstanding", label: "Outstanding", align: "right" },
    ],
    permission: "finance",
  },
  {
    id: "receivable-details",
    group: "Receivables",
    title: "AR Aging Details",
    description: "Open invoice balances, customers, and days overdue.",
    columns: [
      { key: "invoice", label: "Invoice" },
      { key: "customer", label: "Customer" },
      { key: "dueDate", label: "Due date" },
      { key: "age", label: "Age" },
      { key: "outstanding", label: "Outstanding", align: "right" },
    ],
    permission: "finance",
  },
  {
    id: "invoice-details",
    group: "Receivables",
    title: "Invoice Details",
    description: "Issued invoices, status, dates, and amounts.",
    columns: [
      { key: "invoice", label: "Invoice" },
      { key: "customer", label: "Customer" },
      { key: "issueDate", label: "Issue date" },
      { key: "dueDate", label: "Due date" },
      { key: "status", label: "Status" },
      { key: "total", label: "Total", align: "right" },
      { key: "paid", label: "Paid", align: "right" },
    ],
    permission: "finance",
  },
  {
    id: "customer-balances",
    group: "Receivables",
    title: "Customer Balance Summary",
    description: "Invoiced, received, and outstanding totals by customer.",
    columns: [
      { key: "customer", label: "Customer" },
      { key: "invoiceCount", label: "Invoice count", align: "right" },
      { key: "sales", label: "Sales", align: "right" },
      { key: "received", label: "Received", align: "right" },
      { key: "outstanding", label: "Outstanding", align: "right" },
    ],
    permission: "finance",
  },
  {
    id: "payments-received",
    group: "Payments received",
    title: "Payments Received",
    description: "Recorded invoice receipts, methods, and customers.",
    columns: [
      { key: "date", label: "Date" },
      { key: "reference", label: "Reference" },
      { key: "customer", label: "Customer" },
      { key: "method", label: "Method" },
      { key: "amount", label: "Amount", align: "right" },
    ],
    permission: "finance",
  },
  {
    id: "time-to-get-paid",
    group: "Payments received",
    title: "Time to Get Paid",
    description: "Elapsed time between invoice issue and first receipt.",
    columns: [
      { key: "invoice", label: "Invoice" },
      { key: "customer", label: "Customer" },
      { key: "issueDate", label: "Issue date" },
      { key: "firstPayment", label: "First payment" },
      { key: "daysToPay", label: "Days to pay", align: "right" },
      { key: "received", label: "Received", align: "right" },
    ],
    permission: "finance",
  },
  {
    id: "expenses-by-category",
    group: "Expenses",
    title: "Expenses by Category",
    description: "Expense count and total by category.",
    columns: [
      { key: "category", label: "Category" },
      { key: "expenseCount", label: "Expense count", align: "right" },
      { key: "amount", label: "Amount", align: "right" },
    ],
    permission: "finance",
  },
  {
    id: "expenses-by-vendor",
    group: "Expenses",
    title: "Expenses by Vendor",
    description: "Expense count and total by vendor.",
    columns: [
      { key: "vendor", label: "Vendor" },
      { key: "expenseCount", label: "Expense count", align: "right" },
      { key: "amount", label: "Amount", align: "right" },
    ],
    permission: "finance",
  },
  {
    id: "customer-activity",
    group: "Customers",
    title: "Customer Activity",
    description: "New customers, ownership, and recorded CRM activity.",
    columns: [
      { key: "customer", label: "Customer" },
      { key: "company", label: "Company" },
      { key: "created", label: "Added" },
      { key: "invoices", label: "Invoices", align: "right" },
      { key: "proposals", label: "Proposals", align: "right" },
      { key: "owner", label: "Assigned to" },
    ],
    permission: "customers",
  },
  {
    id: "proposal-details",
    group: "Proposals / quotes",
    title: "Quote Details",
    description: "Proposal status, customer, owner, validity, and value.",
    columns: [
      { key: "proposal", label: "Quote" },
      { key: "title", label: "Title" },
      { key: "customer", label: "Customer" },
      { key: "status", label: "Status" },
      { key: "preparedBy", label: "Prepared by" },
      { key: "validUntil", label: "Valid until" },
      { key: "total", label: "Total", align: "right" },
    ],
    permission: "proposals",
  },
  {
    id: "proposal-items",
    group: "Proposals / quotes",
    title: "Quote Item Details",
    description: "Services and line items quoted to customers.",
    columns: [
      { key: "proposal", label: "Quote" },
      { key: "customer", label: "Customer" },
      { key: "item", label: "Item / service" },
      { key: "quantity", label: "Quantity", align: "right" },
      { key: "total", label: "Quoted total", align: "right" },
    ],
    permission: "proposals",
  },
  {
    id: "customer-retention",
    group: "Retention",
    title: "Customer Retention",
    description: "Repeat customers and latest invoice or quote activity.",
    columns: [
      { key: "customer", label: "Customer" },
      { key: "segment", label: "Relationship" },
      { key: "invoiceCount", label: "Invoices", align: "right" },
      { key: "proposalCount", label: "Quotes", align: "right" },
      { key: "lastActivity", label: "Latest recorded activity" },
    ],
    permission: "retention",
  },
];

export const reportGroups: ReportGroup[] = [
  "Sales",
  "Receivables",
  "Payments received",
  "Expenses",
  "Customers",
  "Proposals / quotes",
  "Retention",
];

export function isReportId(value: string | undefined): value is ReportId {
  return reportCatalog.some((report) => report.id === value);
}
