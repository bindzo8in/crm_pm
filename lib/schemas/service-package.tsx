import { BillingCycle } from "@/app/generated/prisma/enums";
import { z } from "zod";

export const packageItemSchema = z.object({
  id: z.string().optional(),

  name: z
    .string(),

  description: z.string().optional(),

  quantity: z
    .number()
    .min(1, "Quantity must be at least 1"),

  unitPrice: z
    .number()
    .min(0, "Unit price must be positive"),

  unitPriceUSD: z
    .number()
    .min(0, "Unit price USD must be positive"),

  sacCode: z.string().optional(),

  unit: z.string().trim().min(1, "Unit is required").max(40),

  billingCycle: z.enum(BillingCycle),

  sortOrder: z.number(),
});

export const packageFeatureSchema = z.object({
  id: z.string().optional(),

  name: z
    .string()
    .min(1, "Feature name is required"),

  isHeading: z.boolean().default(false).optional(),

  sortOrder: z.number(),
});

export const servicePackageSchema = z.object({
  id: z.string().optional(),

  serviceId: z.string(),

  name: z
    .string()
    .trim()
    .min(2, "Package name is required"),

  description: z.string().optional(),

  sacCode: z.string().optional(),

  isPopular: z.boolean(),

  isActive: z.boolean(),

  hasItems: z.boolean().default(true),

  items: z.array(packageItemSchema),

  features: z.array(packageFeatureSchema),
}).superRefine((servicePackage, ctx) => {
  if (!servicePackage.hasItems && servicePackage.items.length > 1) {
    ctx.addIssue({
      code: "custom",
      message: "A package without separate items can only have one item row",
      path: ["items"],
    });
  }

  if (servicePackage.hasItems) {
    if (servicePackage.items.length === 0) {
      ctx.addIssue({
        code: "custom",
        message: "Add at least one item when the package has separate items",
        path: ["items"],
      });
    }

    servicePackage.items.forEach((item, index) => {
      if (!item.name.trim()) {
        ctx.addIssue({
          code: "custom",
          message: "Item name is required when the package has separate items",
          path: ["items", index, "name"],
        });
      }
    });
  }
}).transform((servicePackage) => {
  const { items, name, description, sacCode, hasItems } = servicePackage;

  if (!hasItems) {
    const item = items[0];
    return {
      ...servicePackage,
      items: [{
        ...(item ?? {
          quantity: 1,
          unitPrice: 0,
          unitPriceUSD: 0,
          unit: "Unit",
          billingCycle: BillingCycle.MONTHLY,
          sortOrder: 0,
        }),
        name,
        description: description?.trim() || "",
        sacCode: item?.sacCode || sacCode || "9983",
      }],
    };
  }

  if (items.length === 1) {
    return {
      ...servicePackage,
      items: [{
        ...items[0],
        name: items[0].name.trim() || name,
        description: items[0].description?.trim() || description?.trim() || "",
        sacCode: items[0].sacCode || sacCode || "9983",
      }],
    };
  }

  return servicePackage;
});

export type ServicePackageInput = z.input<typeof servicePackageSchema>;
export type ServicePackageSchema = z.output<typeof servicePackageSchema>;

export const servicePackageQuerySchema = z.object({
  page: z.number().min(0).default(0),
  pageSize: z.number().min(1).max(100).default(10),

  search: z.string().optional(),

  sortDirection: z.enum([
    "asc",
    "desc",
  ]).default("desc"),

  isActive: z.boolean().optional(),
  isPopular: z.boolean().optional(),

  serviceId: z.string().optional()

})

export type ServicePackageQuerySchema = z.infer<typeof servicePackageQuerySchema>;