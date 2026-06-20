import * as z from "zod"

export interface ActionResponse<T = any> {
  success: boolean
  message: string
  errors?: {
    [K in keyof T]?: string[]
  }
  inputs?: T
}
export const forgotPasswordSchema = z.object({
  "email": z.email({ error: 'Please enter a valid email' })
});

export type ForgotPasswordSchema = z.infer<typeof forgotPasswordSchema>