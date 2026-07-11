"use server"

import { ProposalWhereInput } from "@/app/generated/prisma/models";
import { errorResponse, successResponse } from "@/lib/action-response";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getErrorMessage } from "@/lib/schemas/prisma-utils";
import { ProposalQuerySchema, proposalSchema, ProposalSchema } from "@/lib/schemas/proposal-schema"
import { addDays } from "date-fns";
import { headers } from "next/headers";
import { sendProposalLinkEmail } from "@/lib/email";

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
                title: title || "",
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

export async function updateProposalStatus(proposalId: string, status: "DRAFT" | "SENT" | "ACCEPTED" | "REJECTED" | "EXPIRED") {
    try {
        const session = await auth.api.getSession({
            headers: await headers()
        })
        if (!session?.user) {
            return errorResponse("You don't have permission to update this proposal");
        }

        const hasPermission = await auth.api.userHasPermission({
            headers: await headers(),
            body: {
                permissions: {
                    proposals: ["update"]
                }
            }
        })
        if (!hasPermission.success) {
            return errorResponse<string>("You don't have permission to update this proposal");
        }

        await prisma.proposal.update({
            where: { id: proposalId },
            data: { status }
        });

        return successResponse("Proposal status updated successfully");
    } catch (error) {
        console.error("Failed to update proposal status:", error);
        return errorResponse("Failed to update proposal status", getErrorMessage(error));
    }
}

export async function updateProposal(id: string, data: ProposalSchema) {
    try {
        const hasPermission = await auth.api.userHasPermission({
            headers: await headers(),
            body: {
                permissions: {
                    proposals: ["update"]
                }
            }
        });

        if (!hasPermission.success) {
            return errorResponse<string>("You don't have permission to update proposals");
        }

        const validated = proposalSchema.safeParse(data);

        if (!validated.success) {
            return errorResponse("Invalid proposal data", validated.error.issues);
        }

        const existingProposal = await prisma.proposal.findUnique({
            where: { id }
        });

        if (!existingProposal) {
            return errorResponse("Proposal not found");
        }

        if (existingProposal.status !== "DRAFT") {
            return errorResponse("Only proposals in DRAFT status can be edited");
        }

        const { validUntil, ...restData } = validated.data;
        const validityDays: Record<string, number> = {
            "07_Days": 7,
            "15_Days": 15,
            "30_Days": 30,
        } as const;
        
        // Use existing createdAt or fallback to now for calculation
        const baseDate = existingProposal.createdAt || new Date();
        // Just recreate addDays manually to avoid import issues if addDays is not available here, but it should be since createProposal uses it.
        // Let's assume addDays is imported.
        const addDays = (date: Date, days: number) => {
            const result = new Date(date);
            result.setDate(result.getDate() + days);
            return result;
        }

        const validUntilDate = addDays(
            baseDate,
            validityDays[validUntil] ?? 7
        );

        const updatedProposal = await prisma.proposal.update({
            where: { id },
            data: {
                customerId: restData.customerId,
                customerDisplayName: restData.customerDisplayName,
                customerCompanyName: restData.customerCompanyName,
                title: restData.title || "",
                notes: restData.notes,
                validUntil: validUntilDate,
            }
        });

        return successResponse<{ id: string }>("Proposal updated successfully", {
            id: updatedProposal.id
        });
    } catch (error) {
        console.error("Failed to update proposal:", error);
        return errorResponse("Failed to update proposal", getErrorMessage(error));
    }
}

export async function DeleteProposal(id: string) {
    try {
        const hasPermission = await auth.api.userHasPermission({
            headers: await headers(),
            body: {
                permissions: {
                    proposals: ["delete"]
                }
            }
        })
        if (!hasPermission.success) {
            return errorResponse<string>("You don't have permission to delete this proposal");
        }

        await prisma.proposal.delete({
            where: {
                id, status: { notIn: ["SENT", "ACCEPTED", "REJECTED", "EXPIRED"] },
            },
        });

        return successResponse("Proposal deleted successfully");
    } catch (error) {
        console.error("Failed to delete proposal:", error);
        return errorResponse("Failed to delete proposal", getErrorMessage(error));
    }
}

export async function DuplicateProposal(id: string) {
    try {
        const hasPermission = await auth.api.userHasPermission({
            headers: await headers(),
            body: {
                permissions: {
                    proposals: ["create"]
                }
            }
        });
        
        if (!hasPermission.success) {
            return errorResponse<string>("You don't have permission to duplicate this proposal");
        }

        const existingProposal = await prisma.proposal.findUnique({
            where: { id },
            include: {
                proposalBlocks: true,
                proposalServices: {
                    include: {
                        items: true,
                        features: true
                    }
                }
            }
        });

        if (!existingProposal) {
            return errorResponse("Proposal not found");
        }

        const newProposal = await prisma.proposal.create({
            data: {
                customerId: existingProposal.customerId,
                customerDisplayName: existingProposal.customerDisplayName,
                customerCompanyName: existingProposal.customerCompanyName,
                preparedById: existingProposal.preparedById,
                preparedByName: existingProposal.preparedByName,
                title: `${existingProposal.title} (Copy)`,
                notes: existingProposal.notes,
                validUntil: existingProposal.validUntil,
                currency: existingProposal.currency,
                status: "DRAFT",
                subtotal: existingProposal.subtotal,
                discount: existingProposal.discount,
                tax: existingProposal.tax,
                roundOff: existingProposal.roundOff,
                grandTotal: existingProposal.grandTotal,
                bankAccountId: existingProposal.bankAccountId,
            }
        });

        // Duplicate blocks
        for (const block of existingProposal.proposalBlocks) {
            await prisma.proposalBlock.create({
                data: {
                    proposalId: newProposal.id,
                    type: block.type,
                    sortOrder: block.sortOrder,
                    title: block.title,
                    isVisible: block.isVisible,
                    isLocked: block.isLocked,
                    isSystemGenerated: block.isSystemGenerated,
                    content: block.content ?? undefined
                }
            });
        }

        // Duplicate services
        for (const service of existingProposal.proposalServices) {
            const newService = await prisma.proposalService.create({
                data: {
                    proposalId: newProposal.id,
                    serviceId: service.serviceId,
                    serviceName: service.serviceName,
                    packageId: service.packageId,
                    packageName: service.packageName,
                    description: service.description,
                    notes: service.notes,
                    sortOrder: service.sortOrder
                }
            });

            for (const item of service.items) {
                await prisma.proposalLineItem.create({
                    data: {
                        proposalServiceId: newService.id,
                        packageItemId: item.packageItemId,
                        name: item.name,
                        description: item.description,
                        quantity: item.quantity,
                        unit: item.unit,
                        unitPrice: item.unitPrice,
                        total: item.total,
                        billingCycle: item.billingCycle,
                        sortOrder: item.sortOrder,
                        isCustom: item.isCustom,
                        discountType: item.discountType,
                        discountValue: item.discountValue,
                        taxRate: item.taxRate
                    }
                });
            }

            for (const feature of service.features) {
                await prisma.proposalFeature.create({
                    data: {
                        proposalServiceId: newService.id,
                        content: feature.content,
                        sortOrder: feature.sortOrder,
                        serviceId: feature.serviceId,
                        packageId: feature.packageId
                    }
                });
            }
        }

        return successResponse<{ id: string }>("Proposal duplicated successfully", { id: newProposal.id });
    } catch (error) {
        console.error("Failed to duplicate proposal:", error);
        return errorResponse("Failed to duplicate proposal", getErrorMessage(error));
    }
}

export async function getProposals(query: ProposalQuerySchema) {
    try {
        const { page, pageSize, search, status, sortDirection, customerId } = query

        const where: ProposalWhereInput = {
            status: status ? { equals: status } : undefined,
            customerId: customerId ? { equals: customerId } : undefined,
            ...(search && {
                OR: [
                    {
                        customerDisplayName: {
                            contains: search,
                            mode: "insensitive",
                        },
                    },
                    {
                        customerCompanyName: {
                            contains: search,
                            mode: "insensitive",
                        },
                    },
                    {
                        title: {
                            contains: search,
                            mode: "insensitive",
                        },
                    }
                ]
            })
        }

        const [proposals, total] = await prisma.$transaction([
            prisma.proposal.findMany({
                take: pageSize,
                skip: page * pageSize,

                select: {
                    id: true,
                    customerDisplayName: true,
                    customerCompanyName: true,
                    preparedByName: true,
                    status: true,
                    validUntil: true,
                    proposalNumber: true,
                    grandTotal: true,
                    title: true,
                },
                where,
                orderBy: [{
                    createdAt: sortDirection,
                }, {
                    id: "desc"
                }]
            }),
            prisma.proposal.count({
                where,
            })
        ])

        const data = proposals.map((proposal) => ({
            ...proposal,
            grandTotal: proposal.grandTotal.toNumber(),
        }));

        return successResponse("Proposals fetched successfully", { data, pagination: { page, pageSize, total, pageCount: Math.ceil(total / pageSize) } });

    } catch (error) {
        if (process.env.NODE_ENV === "development") {
            console.error(error);
        }

        return errorResponse("Failed to get proposals", getErrorMessage(error));
    }
}

export async function sendProposalEmailAction(proposalId: string, email: string, proposalUrl: string) {
    try {
        const session = await auth.api.getSession({
            headers: await headers()
        });
        if (!session?.user) {
            return errorResponse("You don't have permission to send emails");
        }

        const company = await prisma.company.findFirst();
        const companyName = company?.displayName || company?.legalName || "Our Company";

        await sendProposalLinkEmail({
            email,
            appName: companyName,
            proposalUrl,
            companyName
        });

        // Update status to SENT
        await updateProposalStatus(proposalId, "SENT");

        return successResponse("Email sent successfully");
    } catch (error) {
        console.error("Failed to send proposal email:", error);
        return errorResponse("Failed to send proposal email", getErrorMessage(error));
    }
}