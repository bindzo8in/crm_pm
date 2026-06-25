import * as z from "zod"

export interface ActionResponse<T = any> {
  success: boolean
  message: string
  errors?: {
    [K in keyof T]?: string[]
  }
  inputs?: T
}
export const serviceSchema = z.object({
  id: z.string().optional(),
  name: z.string({ error: 'This field is required' }).min(2, 'Service name is too short').max(255, 'Service name is too long').trim(),
  slug: z.string().optional(),
  description: z.string({ error: 'This field is required' }).optional(),
  isActive: z.boolean()
});

export const serviceQuerySchema = z.object({
  page: z.number().min(0).default(0),
  pageSize: z.number().min(1).max(100).default(10),

  search: z.string().optional(),

  sortDirection: z.enum([
    "asc",
    "desc",
  ]).default("desc"),

  isActive: z.boolean().optional(),
});

export type ServiceSchema = z.infer<typeof serviceSchema>
export type ServiceQuerySchema = z.infer<typeof serviceQuerySchema>