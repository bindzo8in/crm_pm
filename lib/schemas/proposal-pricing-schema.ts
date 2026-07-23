import { BillingCycle, DiscountType } from "@/app/generated/prisma/enums";
import { z } from "zod";

export const importServicePackageSchema = z.object({
  proposalId: z.string().nonempty("Proposal ID is required"),
  serviceId: z.string().nonempty("Service ID is required"),
  packageId: z.string().nonempty("Package ID is required"),
  customName: z.string().optional().nullable(),
});

export type ImportServicePackageSchema = z.infer<typeof importServicePackageSchema>;

export const proposalServiceEditSchema = z.object({
  proposalServiceId: z.string().nonempty("Proposal Service ID is required"),
  proposalId: z.string().nonempty("Proposal ID is required"),
  serviceName: z.string().min(1, "Section display name is required"),
  description: z.string().optional().nullable(),
});

export type ProposalServiceEditSchema = z.infer<typeof proposalServiceEditSchema>;

export const proposalLineItemEditSchema = z.object({
  id: z.string().nonempty("Item ID is required"),
  proposalId: z.string().nonempty("Proposal ID is required"),
  name: z.string().min(1, "Item name is required"),
  description: z.string().optional().nullable(),
  quantity: z.coerce.number().int().min(1, "Quantity must be at least 1"),
  unit: z.string().optional(),
  unitPrice: z.coerce.number().min(0, "Unit price must be non-negative"),
  billingCycle: z.enum(BillingCycle),
  sortOrder: z.number().int().optional(),
  discountType: z.enum(DiscountType).optional().nullable(),
  discountValue: z.coerce.number().min(0).optional().nullable(),
  taxRate: z.coerce.number().min(0).default(0),
  sacCode: z.string().optional().nullable(),
});

export type ProposalLineItemEditSchema = z.infer<typeof proposalLineItemEditSchema>;

export const customLineItemCreateSchema = z.object({
  proposalServiceId: z.string().nonempty("Proposal Service ID is required"),
  proposalId: z.string().nonempty("Proposal ID is required"),
  name: z.string().min(1, "Item name is required"),
  description: z.string().optional().nullable(),
  quantity: z.coerce.number().int().min(1, "Quantity must be at least 1").default(1),
  unit: z.string().nonempty("Unit is required").default("Unit"),
  unitPrice: z.coerce.number().min(0, "Unit price must be non-negative").default(0),
  billingCycle: z.enum(BillingCycle).default("ONE_TIME"),
  discountType: z.enum(DiscountType).optional().nullable(),
  discountValue: z.coerce.number().min(0).optional().nullable(),
  taxRate: z.coerce.number().min(0).default(0),
  sacCode: z.string().optional().nullable(),
});

export type CustomLineItemCreateSchema = z.infer<typeof customLineItemCreateSchema>;

export const proposalTotalsUpdateSchema = z.object({
  proposalId: z.string().nonempty("Proposal ID is required"),
  discount: z.coerce.number().min(0, "Discount must be non-negative").default(0),
  tax: z.coerce.number().min(0, "Tax must be non-negative").default(0),
});

export type ProposalTotalsUpdateSchema = z.infer<typeof proposalTotalsUpdateSchema>;
