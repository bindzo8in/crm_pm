import { z } from "zod";

export const financialAccountTypeSchema = z.enum(["BANK", "CASH"]);
export const expenseStatusSchema = z.enum(["PENDING", "COMPLETED", "CANCELLED", "REVERSED"]);

export const financialAccountSchema = z.object({
  name: z.string().trim().min(1, "Account name is required"),
  type: financialAccountTypeSchema.default("BANK"),
  companyBankAccountId: z.string().optional().nullable(),
  openingBalance: z.coerce.number().nonnegative("Opening balance must be zero or greater"),
  openingBalanceDate: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

export const expenseCategorySchema = z.object({
  name: z.string().trim().min(1, "Category name is required"),
  description: z.string().trim().max(200).optional().nullable(),
  isActive: z.boolean().default(true),
});

export const expenseCategoryPageSchema = z.object({
  search: z.string().trim().max(120).default(""),
  cursor: z.string().trim().min(1).max(128).optional(),
  pageSize: z.number().int().min(1).max(100).default(20),
});

export const expenseSchema = z.object({
  description: z.string().trim().min(1, "Expense description is required"),
  amount: z
    .union([z.string(), z.number()])
    .transform(String)
    .refine((value) => /^\d{1,10}(\.\d{1,2})?$/.test(value), "Enter an amount with up to two decimal places")
    .refine((value) => Number(value) > 0, "Amount must be greater than zero"),
  expenseDate: z.string().min(1, "Expense date is required"),
  paymentMethod: z.enum(["BANK_TRANSFER", "UPI", "CREDIT_CARD", "DEBIT_CARD", "CHEQUE", "CASH", "OTHER"]).default("BANK_TRANSFER"),
  financialAccountId: z.string().min(1, "Financial account is required"),
  categoryId: z.string().min(1, "Expense category is required"),
  vendorName: z.string().trim().optional().nullable(),
  customerId: z.string().trim().optional().nullable(),
  referenceNumber: z.string().trim().optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
  status: expenseStatusSchema.default("PENDING"),
  receiptUrl: z.union([z.literal(""), z.url()]).optional().nullable(),
  expenseType: z.enum(["GOODS", "SERVICES"]).default("SERVICES"),
  sacCode: z.string().trim().max(20).optional().nullable(),
  gstTreatment: z.enum([
    "REGISTERED_REGULAR",
    "REGISTERED_COMPOSITION",
    "UNREGISTERED",
    "CONSUMER",
    "OVERSEAS",
    "SEZ",
    "DEEMED_EXPORT",
    "NON_GST_SUPPLY",
    "OUT_OF_SCOPE",
    "TAX_DEDUCTOR",
    "SEZ_DEVELOPER",
    "INPUT_SERVICE_DISTRIBUTOR",
  ]).optional().nullable(),
  sourceOfSupply: z.string().trim().max(80).optional().nullable(),
  destinationOfSupply: z.string().trim().max(80).optional().nullable(),
  reverseCharge: z.boolean().default(false),
  taxRate: z.number().int().min(0).max(28).optional().nullable(),
  taxInclusive: z.boolean().default(false),
});

export const financeReportSchema = z.object({
  startDate: z.union([z.literal(""), z.iso.date()]).default(""),
  endDate: z.union([z.literal(""), z.iso.date()]).default(""),
  type: z.enum(["ALL", "INCOME", "EXPENSE"]).default("ALL"),
  categoryId: z.string().default("ALL"),
  accountId: z.string().default("ALL"),
  paymentMethod: z.string().default("ALL"),
  status: z.string().default("ALL"),
  creatorId: z.string().default("ALL"),
  search: z.string().trim().max(120).default(""),
  minAmount: z.union([z.literal(""), z.string().regex(/^\d{1,10}(\.\d{1,2})?$/)]).default(""),
  maxAmount: z.union([z.literal(""), z.string().regex(/^\d{1,10}(\.\d{1,2})?$/)]).default(""),
  page: z.number().int().min(0).default(0),
  pageSize: z.number().int().min(1).max(100).default(20),
  sort: z.enum(["date", "amount", "description"]).default("date"),
  direction: z.enum(["asc", "desc"]).default("desc"),
});

export type FinancialAccountInput = z.infer<typeof financialAccountSchema>;
export type ExpenseCategoryInput = z.infer<typeof expenseCategorySchema>;
export type ExpenseCategoryPageInput = z.input<typeof expenseCategoryPageSchema>;
export type ExpenseInput = z.infer<typeof expenseSchema>;
export type FinanceReportInput = z.input<typeof financeReportSchema>;
