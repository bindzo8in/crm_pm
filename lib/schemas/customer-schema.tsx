import { CustomerType } from "@/app/generated/prisma/enums";
import * as z from "zod";

const optionalText = z.string().trim().optional();

export const customerDocumentsSchema = z.array(z.object({
    url: z.url(),
    publicId: z.string().trim().min(1),
    resourceType: z.enum(["image", "raw"]),
    fileName: z.string().trim().max(255).optional(),
})).max(3);

export const customerDisplayNameAvailabilitySchema = z.object({
    displayName: z.string().trim().min(1, "Display name is required"),
    customerId: z.string().min(1).optional(),
});

export const customerSchema = z.object({
    id: z.string().optional(),
    customerNumber: z.number().optional(),
    displayName: z.string()
        .trim()
        .transform((value) => value.replace(/\s+/g, " "))
        .pipe(z.string().min(1, "Display name is required")),
    companyName: optionalText,

    primaryContactSalutation: optionalText,
    primaryContactName: optionalText,

    primaryContactEmail: z
        .string()
        .trim()
        .optional()
        .refine(
            (v) => !v || z.string().email().safeParse(v).success,
            "Please enter a valid email"
        ),

    primaryContactPhone: z
        .string()
        .trim()
        .optional()
        .refine(
            (v) => !v || /^\+?[1-9]\d{9,14}$/.test(v),
            "Please enter a valid phone number"
        ),
    currency: z.string().trim().min(3).max(3).default("INR"),
    customerLanguage: z.string().trim().min(1).max(40).default("English"),
    gstTreatment: z.enum([
        "REGISTERED_REGULAR",
        "REGISTERED_COMPOSITION",
        "UNREGISTERED",
        "CONSUMER",
        "OVERSEAS",
        "SEZ",
    ]).optional(),
    placeOfSupply: optionalText,
    taxPreference: z.enum(["TAXABLE", "TAX_EXEMPT"]).default("TAXABLE"),
    paymentTerms: z.enum([
        "DUE_ON_RECEIPT",
        "NET_15",
        "NET_30",
        "NET_45",
        "NET_60",
    ]).default("DUE_ON_RECEIPT"),
    portalEnabled: z.boolean().default(false),
    documents: customerDocumentsSchema.default([]),

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
    customerType: z.enum(CustomerType).optional(),

    sortDirection: z.enum([
        "asc",
        "desc",
    ]).default("desc"),
});

export type CustomerQuerySchema = z.infer<
    typeof CustomerQuerySchema
>;

export type CustomerSchema = z.infer<typeof customerSchema>;
export type CustomerSchemaInput = z.input<typeof customerSchema>;