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
