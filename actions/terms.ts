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

        const { title, content, isActive, isDefault, packages } = validatedData.data;
        const plainContent = JSON.parse(JSON.stringify(content));

        await prisma.proposalTerm.create({
            data: {
                title,
                content: plainContent,
                isActive,
                isDefault,
                packages:
                    packages && packages.length > 0
                        ? {
                            create: packages
                                .filter((p) => p.include !== false)
                                .map((p, index) => ({
                                    packageId: p.packageId,
                                    isRequired: p.isRequired ?? true,
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
        const { id, title, content, isActive, isDefault, packages } = validatedData.data;

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

            if (packages) {
                await tx.proposalTermPackage.deleteMany({
                    where: { termId: id },
                });

                const includedPackages = packages.filter((p) => p.include !== false);
                if (includedPackages.length > 0) {
                    await tx.proposalTermPackage.createMany({
                        data: includedPackages.map((p, index) => ({
                            termId: id,
                            packageId: p.packageId,
                            isRequired: p.isRequired ?? true,
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
                packages: {
                    include: {
                        package: {
                            select: {
                                name: true,
                                service: {
                                    select: {
                                        name: true
                                    }
                                }
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
            packages: term.packages.map((p) => ({
                packageId: p.packageId,
                packageName: `${p.package.service.name} - ${p.package.name}`,
                include: true,
                isRequired: p.isRequired,
                disabled: false,
                sortOrder: p.sortOrder,
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
        const { page, pageSize, search, sortDirection, isActive, isDefault } = query;

        const where: Prisma.ProposalTermWhereInput = {
            ...(search && {
                title: {
                    contains: search,
                    mode: "insensitive" as const,
                },
            }),
            ...(isActive !== undefined && { isActive }),
            ...(isDefault !== undefined && { isDefault })
        };

        const [terms, total] = await prisma.$transaction([
            prisma.proposalTerm.findMany({
                skip: page * pageSize,
                take: pageSize,
                where,
                include: {
                    packages: {
                        include: {
                            package: {
                                select: {
                                    name: true,
                                    service: {
                                        select: {
                                            name: true
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
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

        const formattedTerms = terms.map(term => ({
            ...term,
            packages: term.packages.map(p => ({
                packageId: p.packageId,
                packageName: `${p.package.service.name} - ${p.package.name}`,
                isRequired: p.isRequired,
                sortOrder: p.sortOrder,
            })),
        }));

        return successResponse("Terms found", {
            data: formattedTerms,
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
