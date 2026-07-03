import * as z from "zod";

export const termPackageSchema = z.object({
  packageId: z.string(),
  packageName: z.string().optional(), // Used in UI
  include: z.boolean(),
  isRequired: z.boolean(),
  disabled: z.boolean(),
  sortOrder: z.number(),
});

export const termSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, "Proposal term title is required"),
  packages: z.array(termPackageSchema),
  content: z.any().optional(),
  isActive: z.boolean(),
  isDefault: z.boolean(),
});

export const termQuerySchema = z.object({
  page: z.number().min(0),
  pageSize: z.number().min(1).max(100),

  search: z.string().optional(),

  sortDirection: z.enum([
    "asc",
    "desc",
  ]).default("desc"),

  isActive: z.boolean().optional(),
  isDefault: z.boolean().optional(),
});

export type TermSchema = z.infer<typeof termSchema>;
export type TermQuerySchema = z.infer<typeof termQuerySchema>;
