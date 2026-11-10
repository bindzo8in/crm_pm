import { z } from "zod";

export const bankAccountSchema = z.object({
  accountName: z.string().min(1, "Account Name is required"),
  bankName: z.string().min(1, "Bank Name is required"),
  branch: z.string().optional().nullable(),
  accountNumber: z.string().min(1, "Account Number is required"),
  ifscCode: z.string().min(1, "IFSC Code is required"),
  swiftCode: z.string().optional().nullable(),
  accountType: z.string().optional().nullable(),
  upiId: z.string().optional().nullable(),
  qrCodeImage: z.object({ url: z.string(), publicId: z.string() }).nullable().optional(),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
  displayOrder: z.number().default(0),
});

export type BankAccountFormValues = z.infer<typeof bankAccountSchema>;

export const bankAccountListSchema = z.object({
  page: z.number().int().min(0).default(0),
  pageSize: z.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(120).default(""),
});
