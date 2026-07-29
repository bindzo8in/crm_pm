import { z } from "zod";

export const saveSalaryStructureSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  basicSalary: z.number().min(0).default(0),
  hra: z.number().min(0).default(0),
  conveyance: z.number().min(0).default(0),
  medical: z.number().min(0).default(0),
  specialAllowance: z.number().min(0).default(0),
  providentFund: z.number().min(0).default(0),
  professionalTax: z.number().min(0).default(0),
  tds: z.number().min(0).default(0),
  customComponents: z
    .array(
      z.object({
        name: z.string().min(1, "Component name is required"),
        type: z.enum(["EARNING", "DEDUCTION"]),
        amount: z.number().min(0),
      })
    )
    .optional(),
});

export type SaveSalaryStructureInput = z.infer<typeof saveSalaryStructureSchema>;

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
  status: z.enum(["DRAFT", "GENERATED", "PAID"]),
  paymentDate: z.string().optional(),
  paymentMethod: z.string().optional(),
  referenceId: z.string().optional(),
  notes: z.string().optional(),
});

export type UpdateSalarySlipStatusInput = z.infer<typeof updateSalarySlipStatusSchema>;
