import { BillingCycle, ProposalBlockType } from "@/app/generated/prisma/enums";
import z from "zod";

export const proposalSchema = z.object({

    customerId: z.string().nonempty("customer is required"),
    customerDisplayName: z.string().nonempty("customerDisplayName is required"),
    customerCompanyName: z.string().optional(),

    title: z.string().optional(),

    validUntil: z.enum(["07_Days", "15_Days", "30_Days"]),

    currency: z.enum(["INR", "USD"]),
    exchangeRate: z.number({ message: "Exchange rate must be a valid number" }).min(0.0001, "Exchange rate must be greater than 0").optional().nullable(),
    placeOfSupply: z.string().optional().nullable(),

    notes: z.string().optional(),

}).superRefine((data, ctx) => {
    if (data.notes && data.notes.length > 200) {
        ctx.addIssue({
            code: "custom",
            message: "Notes cannot be longer than 200 characters",
            path: ["notes"],
        })
    }
})

export const proposalQuerySchema = z.object({
    page: z.number().min(0).default(0),
    pageSize: z.number().min(1).max(100).default(10),
    search: z.string().optional(),
    status: z.enum(["DRAFT", "SENT", "ACCEPTED", "REJECTED", "EXPIRED"]).optional(),
    sortDirection: z.enum([
        "asc",
        "desc",
    ]).default("desc"),
    customerId: z.string().optional(),
})


export const proposalBlockSchema = z.object({
    id: z.string().optional(),
    proposalId: z.string().optional(),

    type: z.enum(ProposalBlockType),

    sortOrder: z.number(),

    title: z.string().optional(),

    content: z.any(),
})

export const proposalService = z.object({
    id: z.string().optional(),
    blockId: z.string().optional(),

    serviceName: z.string(),
    packageName: z.string().optional(),
    description: z.string().optional(),

    notes: z.string().optional(),
})

export const proposalLineItemSchema = z.object({
    id: z.string().optional(),
    proposalServiceId: z.string().optional(),

    name: z.string(),
    description: z.string().optional(),

    quantiry: z.number(),
    unit: z.string(),
    unitPrice: z.number(),

    billingCycle: z.enum(BillingCycle),
    sortOrder: z.number(),
})

export const proposalFeatureSchema = z.object({
    id: z.string().optional(),
    proposalServiceId: z.string().optional(),

    content: z.string(),

    sortOrder: z.number(),
})

export type ProposalBlockSchema = z.infer<typeof proposalBlockSchema>
export type ProposalSchema = z.infer<typeof proposalSchema>
export type ProposalQuerySchema = z.infer<typeof proposalQuerySchema>