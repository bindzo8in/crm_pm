"use server";

import { Prisma } from "@/app/generated/prisma/client";
import { errorResponse, successResponse } from "@/lib/action-response";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getErrorMessage } from "@/lib/schemas/prisma-utils";
import { TermQuerySchema, termSchema, TermSchema } from "@/lib/schemas/term-schema";
import { headers } from "next/headers";

export async function CreateTerm(data: TermSchema) {
    try {
        const hasPermission = await auth.api.userHasPermission({
            headers: await headers(),
            body: {
                permissions: {
                    terms: ["create"],
                },
            },
        });

        if (!hasPermission.success) {
            return errorResponse("You don't have permission to create a term");
        }

        const validatedData = termSchema.safeParse(data);
        if (!validatedData.success) {
            return errorResponse(
                "Invalid data provided",
                validatedData.error?.issues
            );
        }

        const { title, content, isActive, isDefault, services } = validatedData.data;
        const plainContent = JSON.parse(JSON.stringify(content));

        await prisma.proposalTerm.create({
            data: {
                title,
                content: plainContent,
                isActive,
                isDefault,
                services:
                    services && services.length > 0
                        ? {
                            create: services
                                .filter((s) => s.include !== false)
                                .map((s, index) => ({
                                    serviceId: s.serviceId,
                                    isRequired: s.isRequired ?? true,
                                    sortOrder: index,
                                })),
                        }
                        : undefined,
            },
        });

        return successResponse("Term created successfully");
    } catch (error) {
        if (process.env.NODE_ENV === "development") {
            console.error(error);
        }
        return errorResponse("Failed to create term", getErrorMessage(error));
    }
}

export async function EditTerm(data: TermSchema) {
    try {
        const hasPermission = await auth.api.userHasPermission({
            headers: await headers(),
            body: {
                permissions: {
                    terms: ["update"],
                },
            },
        });
        if (!hasPermission.success) {
            return errorResponse("You don't have permission to update a term");
        }

        const validatedData = termSchema.safeParse(data);
        if (!validatedData.success) {
            return errorResponse(
                "Invalid data provided",
                validatedData.error?.issues
            );
        }

        const { id, title, content, isActive, isDefault, services } = validatedData.data;

        if (!id) {
            return errorResponse("Term ID is required for updating");
        }

        const term = await prisma.proposalTerm.findUnique({
            where: { id },
            select: { id: true },
        });

        if (!term) {
            return errorResponse("Term not found");
        }

        await prisma.$transaction(async (tx) => {
            await tx.proposalTerm.update({
                where: { id },
                data: {
                    title,
                    content: content ?? {},
                    isActive,
                    isDefault,
                },
            });

            if (services) {
                await tx.proposalTermService.deleteMany({
                    where: { termId: id },
                });

                const includedServices = services.filter((s) => s.include !== false);
                if (includedServices.length > 0) {
                    await tx.proposalTermService.createMany({
                        data: includedServices.map((s, index) => ({
                            termId: id,
                            serviceId: s.serviceId,
                            isRequired: s.isRequired ?? true,
                            sortOrder: index,
                        })),
                    });
                }
            }
        });

        return successResponse("Term updated successfully");
    } catch (error) {
        if (process.env.NODE_ENV === "development") {
            console.error(error);
        }
        return errorResponse("Failed to update term", getErrorMessage(error));
    }
}

export async function GetTerm(id: string) {
    try {
        const term = await prisma.proposalTerm.findUnique({
            where: { id },
            include: {
                services: {
                    include: {
                        service: {
                            select: {
                                name: true,
                            },
                        },
                    },
                    orderBy: {
                        sortOrder: "asc",
                    },
                },
            },
        });

        if (!term) {
            return errorResponse("Term not found");
        }

        const formattedTerm = {
            ...term,
            services: term.services.map((s) => ({
                serviceId: s.serviceId,
                serviceName: s.service.name,
                include: true,
                isRequired: s.isRequired,
                disabled: false,
                sortOrder: s.sortOrder,
            })),
        };

        return successResponse("Term found", formattedTerm);
    } catch (error) {
        if (process.env.NODE_ENV === "development") {
            console.error(error);
        }
        return errorResponse("Failed to get term", getErrorMessage(error));
    }
}

export async function GetTerms(query: TermQuerySchema) {
    try {
        const { page, pageSize, search, sortDirection, isActive } = query;

        const where: Prisma.ProposalTermWhereInput = {
            ...(search && {
                title: {
                    contains: search,
                    mode: "insensitive" as const,
                },
            }),
            ...(isActive !== undefined && { isActive }),
        };

        const [terms, total] = await prisma.$transaction([
            prisma.proposalTerm.findMany({
                skip: page * pageSize,
                take: pageSize,
                where,
                orderBy: [
                    {
                        createdAt: sortDirection,
                    },
                    {
                        id: "desc",
                    },
                ],
            }),
            prisma.proposalTerm.count({
                where,
            }),
        ]);

        return successResponse("Terms found", {
            data: terms,
            pagination: { page, pageSize, total, pageCount: Math.ceil(total / pageSize) },
        });
    } catch (error) {
        if (process.env.NODE_ENV === "development") {
            console.error(error);
        }
        return errorResponse("Failed to get terms", getErrorMessage(error));
    }
}

export async function DeleteTerm(id: string) {
    try {
        const hasPermission = await auth.api.userHasPermission({
            headers: await headers(),
            body: {
                permissions: {
                    terms: ["delete"],
                },
            },
        });

        if (!hasPermission.success) {
            return errorResponse("You don't have permission to delete a term");
        }

        const term = await prisma.proposalTerm.findUnique({
            where: { id },
            select: { id: true },
        });

        if (!term) {
            return errorResponse("Term not found");
        }

        await prisma.proposalTerm.delete({
            where: { id },
        });

        return successResponse("Term deleted successfully");
    } catch (error) {
        if (process.env.NODE_ENV === "development") {
            console.error(error);
        }
        return errorResponse("Failed to delete term", getErrorMessage(error));
    }
}
