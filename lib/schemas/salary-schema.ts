import { z } from "zod";

export const salaryComponentSchema = z.object({
  name: z.string().trim().min(1, "Component name is required"),
  type: z.enum(["EARNING", "DEDUCTION"]),
  amount: z.number().min(0),
});

export const salaryComponentsSchema = z.array(salaryComponentSchema);

export const saveSalaryStructureSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  basicSalary: z.coerce.number().min(0).default(0),
  hra: z.coerce.number().min(0).default(0),
  conveyance: z.coerce.number().min(0).default(0),
  medical: z.coerce.number().min(0).default(0),
  specialAllowance: z.coerce.number().min(0).default(0),
  providentFund: z.coerce.number().min(0).default(0),
  professionalTax: z.coerce.number().min(0).default(0),
  tds: z.coerce.number().min(0).default(0),
  customComponents: z.array(salaryComponentSchema).optional(),
});

export type SaveSalaryStructureInput = z.infer<typeof saveSalaryStructureSchema>;

export const salarySlipsQuerySchema = z.object({
  userId: z.string().min(1).optional(),
  month: z.number().int().min(1).max(12).optional(),
  year: z.number().int().min(2000).max(2100).optional(),
});

export const generateSalarySlipSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
  medicalReimbursement: z.number().min(0).optional().default(0), // Out of box claim
  extraDeductions: z.number().min(0).optional().default(0),
  extraEarnings: z.number().min(0).optional().default(0),
});

export type GenerateSalarySlipInput = z.infer<typeof generateSalarySlipSchema>;

export const updateSalarySlipStatusSchema = z.object({
  slipId: z.string().min(1, "Slip ID is required"),
  paymentDate: z.iso.date(),
  paymentMethod: z.enum(["BANK_TRANSFER", "UPI", "CASH", "CHEQUE", "OTHER"]),
  referenceId: z.string().trim().max(100).optional(),
  notes: z.string().trim().max(1000).optional(),
});

export type UpdateSalarySlipStatusInput = z.infer<typeof updateSalarySlipStatusSchema>;

export const updateSalarySlipAdjustmentsSchema = z.object({
  slipId: z.string().min(1, "Slip ID is required"),
  medicalReimbursement: z.number().min(0),
  extraEarnings: z.number().min(0),
  extraDeductions: z.number().min(0),
});

export type UpdateSalarySlipAdjustmentsInput = z.infer<typeof updateSalarySlipAdjustmentsSchema>;

export const autoGenerateMonthlySalarySlipsSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
});

export type AutoGenerateMonthlySalarySlipsInput = z.infer<typeof autoGenerateMonthlySalarySlipsSchema>;
