import { z } from "zod";

export const productSchema = z.object({
  id: z.string().optional(),
  sku: z.string().trim().max(80).optional().nullable(),
  name: z.string().trim().min(1, "Product name is required").max(255),
  description: z.string().trim().max(2000).optional().nullable(),
  unit: z.string().trim().min(1).max(40).default("item"),
  basePrice: z.coerce.number().min(0, "Price cannot be negative"),
  basePriceUSD: z.coerce.number().min(0, "USD price cannot be negative"),
  taxRate: z.coerce.number().int().min(0).max(100),
  hsnCode: z.string().trim().max(40).optional().nullable(),
  isActive: z.boolean().default(true),
});

export const productQuerySchema = z.object({
  page: z.number().int().min(0).default(0),
  pageSize: z.number().int().min(1).max(100).default(10),
  search: z.string().trim().max(120).optional(),
  isActive: z.boolean().optional(),
  sortDirection: z.enum(["asc", "desc"]).default("desc"),
});

export const productActiveSchema = z.object({
  id: z.string().min(1),
  isActive: z.boolean(),
});

export type ProductSchema = z.infer<typeof productSchema>;
export type ProductQuerySchema = z.infer<typeof productQuerySchema>;
