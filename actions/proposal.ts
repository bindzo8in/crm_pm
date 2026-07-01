"use server"

import { errorResponse, successResponse } from "@/lib/action-response";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getErrorMessage } from "@/lib/schemas/prisma-utils";
import { proposalSchema, ProposalSchema } from "@/lib/schemas/proposal-schema"
import { addDays } from "date-fns";
import { headers } from "next/headers";

export async function createProposal(proposal: ProposalSchema) {
    try {

        const session = await auth.api.getSession({
            headers: await headers()
        })
        if (!session?.user) {
            return errorResponse(
                "You don't have permission to create a proposal"
            );
        }

        const hasPermission = await auth.api.userHasPermission({
            headers: await headers(),
            body: {
                permissions: {
                    proposals: ["create"]
                }
            }
        })
        if (!hasPermission.success) {
            return errorResponse<string>(
                "You don't have permission to create a proposal"
            );
        }
        const validatedData = proposalSchema.safeParse(proposal)
        if (!validatedData.success) {
            return errorResponse(
                "Invalid data provided",
                validatedData.error?.issues
            );
        }

        const { customerDisplayName, customerCompanyName, title, customerId, validUntil, notes } = validatedData.data

        const validityDays = {
            "07_Days": 7,
            "15_Days": 15,
            "30_Days": 30,
        } as const;

        const validUntilDate = addDays(
            new Date(),
            validityDays[validUntil] ?? 7
        );

        const proposalRes = await prisma.proposal.create({
            data: {
                customerId,
                customerDisplayName,
                customerCompanyName,
                preparedById: session.user.id,
                preparedByName: session.user.name,
                title,
                notes,
                validUntil: validUntilDate,
                currency: "INR",
                status: "DRAFT",
            }
        })
        return successResponse<{ id: string }>("Proposal created successfully", {
            id: proposalRes.id
        })
    } catch (error) {
        if (process.env.NODE_ENV === "development") {
            console.error(error);
        }
        return errorResponse(
            "Failed to create proposal",
            getErrorMessage(error)
        );
    }

}