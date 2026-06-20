import * as z from "zod"

export interface ActionResponse<T = any> {
  success: boolean
  message: string
  errors?: {
    [K in keyof T]?: string[]
  }
  inputs?: T
}
export const signinSchema = z.object({
  "email": z.email({ error: 'Please enter a valid email' }),
  "password": z.string({ error: 'This field is required' }),
  rememberMe: z.boolean(),
});

export type SigninSchema = z.infer<typeof signinSchema>;