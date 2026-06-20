import * as z from "zod"

export interface ActionResponse<T = any> {
  success: boolean
  message: string
  errors?: {
    [K in keyof T]?: string[]
  }
  inputs?: T
}

export const signupSchema = z.object({
  "name": z.string({ error: 'This field is required' }),
  "email": z.email({ error: 'Please enter a valid email' }),
  "password": z.string({ error: 'This field is required' }),
  "confirm-password": z.string({ error: 'This field is required' }),
  "agree": z.literal(true, { error: 'This field is required' })
});

export type SignupSchemaType = z.infer<typeof signupSchema>;