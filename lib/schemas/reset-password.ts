import * as z from "zod"

export interface ActionResponse<T = any> {
  success: boolean
  message: string
  errors?: {
    [K in keyof T]?: string[]
  }
  inputs?: T
}
export const resetPasswordSchema = z.object({
  "password": z.string({ error: 'This field is required' }),
  "confirm-password": z.string({ error: 'This field is required' })
}).refine((data) => data.password === data["confirm-password"], {
  message: "Passwords do not match",
  path: ["confirm-password"],
});

export type ResetPasswordSchema = z.infer<typeof resetPasswordSchema>;

