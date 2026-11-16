"use server"

import { checkOrganizationPermission } from "@/lib/organization-authorization";
import { Prisma } from "@/app/generated/prisma/client";
import { ProposalWhereInput } from "@/app/generated/prisma/models";
import { errorResponse, successResponse } from "@/lib/action-response";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getErrorMessage } from "@/lib/schemas/prisma-utils";
import {
    ProposalQuerySchema,
    proposalQuerySchema,
    proposalSchema,
    ProposalSchema,
} from "@/lib/schemas/proposal-schema";
import { addDays } from "date-fns";
import { headers } from "next/headers";
import { sendProposalLinkEmail } from "@/lib/email";
import { syncProposalComposerTermsAndFeatures } from "@/actions/proposal-composer";
import { z } from "zod";
import { getProposalPermissionScope } from "@/lib/proposal-permissions";
import { getActiveOrganizationId } from "@/lib/organization-authorization";
import { isActiveOrganizationMember } from "@/repositories/organization-member-repository";

type ProposalPermission =
    | "create"
    | "read"
    | "read-own"
    | "update"
    | "update-own"
    | "delete"
    | "delete-own"
    | "send"
    | "send-own"
    | "accept"
    | "accept-own";

async function hasProposalPermission(permission: ProposalPermission): Promise<boolean> {
    const requestHeaders = await headers();
    const session = await auth.api.getSession({ headers: requestHeaders });
    if (!session?.user) return false;

    const result = await checkOrganizationPermission({
        headers: requestHeaders,
        body: { permissions: { proposals: [permission] } },
    });
    return result.success;
}

export async function createProposal(proposal: ProposalSchema) {
    try {

        const requestHeaders = await headers();
        const session = await auth.api.getSession({ headers: requestHeaders });
        if (!session?.user) {
            return errorResponse(
                "You don't have permission to create a proposal"
            );
        }
        const hasPermission = await checkOrganizationPermission({
            headers: requestHeaders,
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

        const {
            customerDisplayName,
            customerCompanyName,
            title,
            customerId,
            validUntil,
            currency,
            exchangeRate,
            placeOfSupply,
            notes,
            assignedToId,
        } = validatedData.data;
        const organizationId = await getActiveOrganizationId(requestHeaders);
        if (
            assignedToId &&
            (!organizationId ||
                !(await isActiveOrganizationMember(organizationId, assignedToId)))
        ) {
            return errorResponse("Choose an active member of this workspace.");
        }

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
                organizationId,
                customerId,
                customerDisplayName,
                customerCompanyName,
                preparedById: session.user.id,
                preparedByName: session.user.name,
                assignedToId: assignedToId || null,
                title: title || "",
                notes,
                validUntil: validUntilDate,
                currency: currency || "INR",
                exchangeRate: exchangeRate !== undefined && exchangeRate !== null ? new Prisma.Decimal(exchangeRate) : new Prisma.Decimal(83.50),
                placeOfSupply: placeOfSupply || null,
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
        const permissionPair = status === "SENT"
            ? ["send", "send-own"] as const
            : status === "ACCEPTED"
                ? ["accept", "accept-own"] as const
                : ["update", "update-own"] as const;
        const access = await getProposalPermissionScope(
            permissionPair[0],
            permissionPair[1],
            proposalId,
        );
        if (!access) {
            return errorResponse("You don't have permission to update this proposal");
        }

        const updated = await prisma.proposal.updateMany({
            where: {
                ...access.where,
                ...(status === "ACCEPTED" ? { status: "SENT" as const } : {}),
            },
            data: {
                status,
                ...(status === "ACCEPTED" ? { acceptedAt: new Date() } : {}),
            },
        });
        if (updated.count === 0) {
            return errorResponse(
                status === "ACCEPTED"
                    ? "Only sent proposals can be accepted."
                    : "Proposal not found.",
            );
        }

        return successResponse("Proposal status updated successfully");
    } catch (error) {
        console.error("Failed to update proposal status:", error);
        return errorResponse("Failed to update proposal status", getErrorMessage(error));
    }
}

export async function manuallyAcceptProposal(proposalId: string) {
    try {
        const validatedProposalId = z.string().min(1).safeParse(proposalId);
        if (!validatedProposalId.success) {
            return errorResponse("Invalid proposal");
        }

        const access = await getProposalPermissionScope("accept", "accept-own", validatedProposalId.data);
        if (!access) return errorResponse("You don't have permission to accept this proposal");

        const result = await prisma.proposal.updateMany({
            where: { ...access.where, status: "SENT" },
            data: { status: "ACCEPTED", acceptedAt: new Date() },
        });

        if (result.count === 0) {
            const existingProposal = await prisma.proposal.findUnique({
                where: { id: validatedProposalId.data },
                select: { id: true },
            });
            return errorResponse(
                existingProposal
                    ? "Only sent proposals can be manually accepted"
                    : "Proposal not found",
            );
        }

        return successResponse("Proposal marked as accepted");
    } catch (error) {
        console.error("Failed to manually accept proposal:", error);
        return errorResponse("Failed to accept proposal", getErrorMessage(error));
    }
}

export async function updateProposal(id: string, data: ProposalSchema) {
    try {
        const access = await getProposalPermissionScope("update", "update-own", id);
        if (!access) {
            return errorResponse<string>("You don't have permission to update proposals");
        }

        const validated = proposalSchema.safeParse(data);

        if (!validated.success) {
            return errorResponse("Invalid proposal data", validated.error.issues);
        }

        const existingProposal = await prisma.proposal.findFirst({
            where: access.where,
        });

        if (!existingProposal) {
            return errorResponse("Proposal not found");
        }

        if (existingProposal.status !== "DRAFT") {
            return errorResponse("Only proposals in DRAFT status can be edited");
        }

        const { validUntil, ...restData } = validated.data;
        const organizationId = await getActiveOrganizationId();
        if (
            restData.assignedToId &&
            (!organizationId ||
                !(await isActiveOrganizationMember(organizationId, restData.assignedToId)))
        ) {
            return errorResponse("Choose an active member of this workspace.");
        }
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

        const updatedProposal = await prisma.proposal.updateMany({
            where: { ...access.where, status: "DRAFT" },
            data: {
                customerId: restData.customerId,
                customerDisplayName: restData.customerDisplayName,
                customerCompanyName: restData.customerCompanyName,
                title: restData.title || "",
                notes: restData.notes,
                validUntil: validUntilDate,
                ...(restData.currency ? { currency: restData.currency } : {}),
                ...(restData.exchangeRate !== undefined ? { exchangeRate: restData.exchangeRate !== null ? new Prisma.Decimal(restData.exchangeRate) : null } : {}),
                ...(restData.placeOfSupply !== undefined ? { placeOfSupply: restData.placeOfSupply } : {}),
                ...(restData.assignedToId !== undefined
                    ? { assignedToId: restData.assignedToId }
                    : {}),
            }
        });
        if (updatedProposal.count === 0) {
            return errorResponse("Proposal is no longer available for editing.");
        }

        try {
            await syncProposalComposerTermsAndFeatures(id, true);
        } catch (e) {
            console.error("Composer auto-sync warning:", e);
        }

        return successResponse<{ id: string }>("Proposal updated successfully", {
            id,
        });
    } catch (error) {
        console.error("Failed to update proposal:", error);
        return errorResponse("Failed to update proposal", getErrorMessage(error));
    }
}

export async function DeleteProposal(id: string) {
    try {
        const access = await getProposalPermissionScope("delete", "delete-own", id);
        if (!access) {
            return errorResponse<string>("You don't have permission to delete this proposal");
        }

        const deleted = await prisma.proposal.deleteMany({
            where: {
                ...access.where,
                status: { notIn: ["SENT", "ACCEPTED", "REJECTED", "EXPIRED"] },
            },
        });
        if (deleted.count === 0) {
            return errorResponse("Proposal not found or it can no longer be deleted.");
        }

        return successResponse("Proposal deleted successfully");
    } catch (error) {
        console.error("Failed to delete proposal:", error);
        return errorResponse("Failed to delete proposal", getErrorMessage(error));
    }
}

export async function DuplicateProposal(id: string) {
    try {
        if (!(await hasProposalPermission("create"))) {
            return errorResponse<string>("You don't have permission to duplicate this proposal");
        }
        const access = await getProposalPermissionScope("read", "read-own", id);
        if (!access) return errorResponse("You don't have permission to duplicate this proposal");

        const existingProposal = await prisma.proposal.findFirst({
            where: access.where,
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
                organizationId: await getActiveOrganizationId(),
                customerId: existingProposal.customerId,
                customerDisplayName: existingProposal.customerDisplayName,
                customerCompanyName: existingProposal.customerCompanyName,
                preparedById: access.userId,
                preparedByName: (await auth.api.getSession({ headers: await headers() }))?.user.name ?? existingProposal.preparedByName,
                assignedToId: existingProposal.assignedToId,
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
                        taxRate: item.taxRate,
                        sacCode: item.sacCode
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
        const access = await getProposalPermissionScope("read", "read-own");
        if (!access) {
            return errorResponse("Your account is not allowed to read proposals.");
        }
        const [
            canUpdateAll,
            canUpdateOwn,
            canDeleteAll,
            canDeleteOwn,
            canSendAll,
            canSendOwn,
            canAcceptAll,
            canAcceptOwn,
            canCreate,
        ] = await Promise.all([
            hasProposalPermission("update"),
            hasProposalPermission("update-own"),
            hasProposalPermission("delete"),
            hasProposalPermission("delete-own"),
            hasProposalPermission("send"),
            hasProposalPermission("send-own"),
            hasProposalPermission("accept"),
            hasProposalPermission("accept-own"),
            hasProposalPermission("create"),
        ]);
        const invoiceCreate = await checkOrganizationPermission({
            body: { permissions: { invoices: ["create"] } },
        });

        const validatedQuery = proposalQuerySchema.safeParse(query);
        if (!validatedQuery.success) {
            return errorResponse("Invalid proposal filters", validatedQuery.error.issues);
        }

        const { page, pageSize, search, status, sortDirection, customerId, validUntilFrom, validUntilTo } = validatedQuery.data
        const validUntil: Prisma.DateTimeFilter | undefined =
            validUntilFrom || validUntilTo
                ? {
                    ...(validUntilFrom ? { gte: new Date(`${validUntilFrom}T00:00:00.000Z`) } : {}),
                    ...(validUntilTo
                        ? {
                            lt: new Date(
                                new Date(`${validUntilTo}T00:00:00.000Z`).getTime() + 24 * 60 * 60 * 1000,
                            ),
                        }
                        : {}),
                }
                : undefined

        const searchFilters: ProposalWhereInput[] = search
            ? [{
                OR: [
                    { customerDisplayName: { contains: search, mode: "insensitive" } },
                    { customerCompanyName: { contains: search, mode: "insensitive" } },
                    { title: { contains: search, mode: "insensitive" } },
                ],
            }]
            : [];
        const where: ProposalWhereInput = {
            status: status ? { equals: status } : undefined,
            customerId: customerId ? { equals: customerId } : undefined,
            validUntil,
            AND: [access.where, ...searchFilters],
        }

        const [proposals, total] = await prisma.$transaction([
            prisma.proposal.findMany({
                take: pageSize,
                skip: page * pageSize,

                select: {
                    id: true,
                    preparedById: true,
                    assignedToId: true,
                    customerId: true,
                    customerDisplayName: true,
                    customerCompanyName: true,
                    customer: {
                        select: {
                            primaryContactEmail: true,
                            primaryContactPhone: true,
                        },
                    },
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
            customerEmail: proposal.customer.primaryContactEmail,
            customerPhone: proposal.customer.primaryContactPhone,
            grandTotal: proposal.grandTotal.toNumber(),
            permissions: {
                canUpdate: canUpdateAll ||
                    (canUpdateOwn && (proposal.preparedById === access.userId || proposal.assignedToId === access.userId)),
                canDelete: canDeleteAll ||
                    (canDeleteOwn && (proposal.preparedById === access.userId || proposal.assignedToId === access.userId)),
                canSend: canSendAll ||
                    (canSendOwn && (proposal.preparedById === access.userId || proposal.assignedToId === access.userId)),
                canAccept: canAcceptAll ||
                    (canAcceptOwn && (proposal.preparedById === access.userId || proposal.assignedToId === access.userId)),
                canCreate,
                canCreateInvoice: invoiceCreate.success,
            },
        }));

        return successResponse("Proposals fetched successfully", { data, pagination: { page, pageSize, total, pageCount: Math.ceil(total / pageSize) } });

    } catch (error) {
        if (process.env.NODE_ENV === "development") {
            console.error(error);
        }

        return errorResponse("Failed to get proposals", getErrorMessage(error));
    }
}

export async function getProposalForEdit(id: string) {
    try {
        const access = await getProposalPermissionScope("read", "read-own", id);
        if (!access) return errorResponse("Proposal not found or you do not have access.");

        const proposal = await prisma.proposal.findFirst({
            where: access.where,
            select: {
                id: true,
                customerId: true,
                title: true,
                customerCompanyName: true,
                customerDisplayName: true,
                notes: true,
                validUntil: true,
                createdAt: true,
                currency: true,
                exchangeRate: true,
                placeOfSupply: true,
                assignedToId: true,
                status: true,
            },
        });
        if (!proposal) return errorResponse("Proposal not found or you do not have access.");

        return successResponse("Proposal loaded.", {
            ...proposal,
            exchangeRate: proposal.exchangeRate?.toNumber() ?? 83.5,
        });
    } catch (error) {
        return errorResponse("Unable to load proposal.", getErrorMessage(error));
    }
}

export async function sendProposalEmailAction(proposalId: string, email: string, proposalUrl: string) {
    try {
        const access = await getProposalPermissionScope("send", "send-own", proposalId);
        if (!access) {
            return errorResponse("You don't have permission to send proposal emails");
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