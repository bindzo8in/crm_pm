import { BillingCycle } from "@/app/generated/prisma/enums";
import { z } from "zod";

export const packageItemSchema = z.object({
  id: z.string().optional(),

  name: z
    .string()
    .min(1, "Item name is required"),

  description: z.string().optional(),

  quantity: z
    .number()
    .min(1, "Quantity must be at least 1"),

  unitPrice: z
    .number()
    .min(0, "Unit price must be positive"),

  unit: z.string().nonempty("Unit is required"),

  billingCycle: z.enum(BillingCycle),

  sortOrder: z.number(),
});

export const packageFeatureSchema = z.object({
  id: z.string().optional(),
  
  name: z
    .string()
    .min(1, "Feature name is required"),

  sortOrder: z.number(),
});

export const servicePackageSchema = z.object({
  id: z.string().optional(),

  serviceId: z.string(),

  name: z
    .string()
    .min(2, "Package name is required"),

  description: z.string().optional(),

  isPopular: z.boolean(),

  isActive: z.boolean(),

  items: z
    .array(packageItemSchema)
    .min(1, "At least one item is required"),

  features: z.array(packageFeatureSchema),
});

export type ServicePackageSchema = z.infer<
  typeof servicePackageSchema
>;