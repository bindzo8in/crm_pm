import * as z from "zod"

  export interface ActionResponse<T = any> {
      success: boolean
      message: string
      errors?: {
          [K in keyof T]?: string[]
      }
      inputs?: T
  }
  export const otpSchema = z.object({
"otp-d8c": z.string().min(6, 'Please enter a valid OTP').optional(),
test: z.any()
});