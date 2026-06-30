import { BillingCycle, ProposalBlockType, ProposalStatus } from "@/app/generated/prisma/enums";
import z from "zod";

export const proposalSchema = z.object({
    id: z.string().optional(),
    proposalNumber: z.number().optional(),

    customerId: z.string().nonempty("customerId is required"),
    customerDisplayName: z.string().nonempty("customerDisplayName is required"),
    customerCompanyName: z.string().optional(),

    preparedById: z.string().nonempty("preparedById is required").optional(),

    title: z.string().nonempty("title is required"),

    status: z.enum(ProposalStatus),

    validUntil: z.enum(["07_Days", "15_Days", "30_Days"]),
    statusChangeReason: z.string().optional(),

    currency: z.literal("INR"),

    notes: z.string().nonempty().optional(),
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