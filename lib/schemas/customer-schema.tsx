import { CustomerType } from "@/app/generated/prisma/enums";
import * as z from "zod";

const optionalText = z.string().trim().optional();

export const customerSchema = z.object({
    id: z.string().optional(),
    customerNumber: z.number().optional(),
    displayName: z.string().trim(),
    companyName: optionalText,

    primaryContactName: optionalText,

    primaryContactEmail: z
        .email("Please enter a valid email").optional(),

    primaryContactPhone: z
        .string()
        .regex(
            /^\+?[1-9]\d{9,14}$/,
            "Please enter a valid phone number"
        ),

    website: z
        .string()
        .trim()
        .optional()
        .refine(
            (v) => !v || z.url().safeParse(v).success,
            "Please enter a valid website URL"
        ),

    addressLine1: optionalText,
    addressLine2: optionalText,
    city: optionalText,
    state: optionalText,
    country: optionalText,
    postalCode: optionalText,

    billingAddressLine1: optionalText,
    billingAddressLine2: optionalText,
    billingCity: optionalText,
    billingState: optionalText,
    billingCountry: optionalText,
    billingPostalCode: optionalText,

    gstNumber: optionalText,
    panNumber: optionalText,

    internalNotes: optionalText,

    customerType: z.enum(CustomerType),
});

export const CustomerQuerySchema = z.object({
    page: z.number().min(0).default(0),
    pageSize: z.number().min(1).max(100).default(10),

    search: z.string().optional(),

    sortDirection: z.enum([
        "asc",
        "desc",
    ]).default("desc"),
});

export type CustomerQuerySchema = z.infer<
    typeof CustomerQuerySchema
>;

export type CustomerSchema = z.infer<typeof customerSchema>;