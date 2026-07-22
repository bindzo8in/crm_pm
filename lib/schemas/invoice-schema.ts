import { z } from "zod";

export const InvoiceStatusEnum = z.enum([
  "DRAFT",
  "SENT",
  "PARTIALLY_PAID",
  "PAID",
  "OVERDUE",
  "VOID",
]);

export const PaymentMethodEnum = z.enum([
  "BANK_TRANSFER",
  "UPI",
  "CREDIT_CARD",
  "DEBIT_CARD",
  "CHEQUE",
  "CASH",
  "OTHER",
]);

export const BillingCycleEnum = z.enum([
  "ONE_TIME",
  "MONTHLY",
  "QUARTERLY",
  "HALF_YEARLY",
  "YEARLY",
]);

export const invoiceLineItemSchema = z.object({
  id: z.string().optional(),
  servicePackageId: z.string().optional().nullable(),
  name: z.string().min(1, "Item name is required"),
  description: z.string().optional().nullable(),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
  unit: z.string().default("item"),
  unitPrice: z.number().min(0, "Unit price must be >= 0"),
  taxRate: z.number().min(0).max(100).default(18),
  billingCycle: BillingCycleEnum.default("ONE_TIME"),
  total: z.number().min(0).optional(),
});

export const createInvoiceSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  proposalId: z.string().optional().nullable(),
  title: z.string().min(1, "Title is required"),
  notes: z.string().optional().nullable(),
  terms: z.string().optional().nullable(),
  dueDate: z.date().optional().nullable(),
  bankAccountId: z.string().optional().nullable(),
  currency: z.string().default("INR"),
  discount: z.number().min(0).default(0),
  lineItems: z.array(invoiceLineItemSchema).min(1, "At least one line item is required"),
});

export const updateInvoiceSchema = createInvoiceSchema.partial().extend({
  id: z.string().min(1, "Invoice ID is required"),
  status: InvoiceStatusEnum.optional(),
});

export const recordPaymentSchema = z.object({
  invoiceId: z.string().min(1, "Invoice ID is required"),
  amount: z.number().positive("Payment amount must be greater than 0"),
  paymentMethod: PaymentMethodEnum.default("BANK_TRANSFER"),
  paymentDate: z.date().default(() => new Date()),
  referenceId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const invoiceQuerySchema = z.object({
  page: z.number().int().min(0).default(0),
  pageSize: z.number().int().min(1).max(100).default(10),
  search: z.string().optional(),
  status: InvoiceStatusEnum.optional(),
  customerId: z.string().optional(),
  sortDirection: z.enum(["asc", "desc"]).default("desc"),
});

export type InvoiceStatusType = z.infer<typeof InvoiceStatusEnum>;
export type PaymentMethodType = z.infer<typeof PaymentMethodEnum>;
export type InvoiceLineItemInput = z.infer<typeof invoiceLineItemSchema>;
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;
export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;
export type InvoiceQuerySchema = z.infer<typeof invoiceQuerySchema>;
