"use server";

import {
  checkOrganizationPermission,
  getActiveOrganizationId,
} from "@/lib/organization-authorization";
import { Prisma } from "@/app/generated/prisma/client";
import { errorResponse, successResponse } from "@/lib/action-response";
import prisma from "@/lib/prisma";
import { getErrorMessage } from "@/lib/schemas/prisma-utils";
import { TermQuerySchema, termSchema, TermSchema } from "@/lib/schemas/term-schema";
import { headers } from "next/headers";

async function getTermsOrganizationId(
    permission: "read" | "create" | "update" | "delete",
) {
    const requestHeaders = await headers();
    const access = await checkOrganizationPermission({
        headers: requestHeaders,
        body: { permissions: { terms: [permission] } },
    });
    if (!access.success) return null;
    return getActiveOrganizationId(requestHeaders);
}

async function hasOrganizationPackages(organizationId: string, packageIds: string[]) {
    const uniqueIds = [...new Set(packageIds)];
    if (uniqueIds.length === 0) return true;
    const packages = await prisma.servicePackage.findMany({
        where: {
            id: { in: uniqueIds },
            service: { organizationId },
        },
        select: { id: true },
    });
    return packages.length === uniqueIds.length;
}

export async function CreateTerm(data: TermSchema) {
    try {
        const organizationId = await getTermsOrganizationId("create");
        if (!organizationId) {
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
        const packageIds = packages?.filter((p) => p.include !== false).map((p) => p.packageId) ?? [];
        if (!(await hasOrganizationPackages(organizationId, packageIds))) {
            return errorResponse("One or more selected packages are unavailable in this organization");
        }
        const plainContent = JSON.parse(JSON.stringify(content));

        await prisma.proposalTerm.create({
            data: {
                organizationId,
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
        const organizationId = await getTermsOrganizationId("update");
        if (!organizationId) {
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

        const term = await prisma.proposalTerm.findFirst({
            where: { id, organizationId },
            select: { id: true },
        });

        if (!term) {
            return errorResponse("Term not found");
        }
        const packageIds = packages?.filter((p) => p.include !== false).map((p) => p.packageId) ?? [];
        if (!(await hasOrganizationPackages(organizationId, packageIds))) {
            return errorResponse("One or more selected packages are unavailable in this organization");
        }

        await prisma.$transaction(async (tx) => {
            const updated = await tx.proposalTerm.updateMany({
                where: { id, organizationId },
                data: {
                    title,
                    content: content ?? {},
                    isActive,
                    isDefault,
                },
            });
            if (updated.count === 0) throw new Error("Term not found");

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
        const organizationId = await getTermsOrganizationId("read");
        if (!organizationId) return errorResponse("You don't have permission to view terms");
        const term = await prisma.proposalTerm.findFirst({
            where: { id, organizationId },
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
        const organizationId = await getTermsOrganizationId("read");
        if (!organizationId) return errorResponse("You don't have permission to view terms");
        const { page, pageSize, search, sortDirection, isActive, isDefault } = query;

        const where: Prisma.ProposalTermWhereInput = {
            organizationId,
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
        const organizationId = await getTermsOrganizationId("delete");
        if (!organizationId) {
            return errorResponse("You don't have permission to delete a term");
        }

        const term = await prisma.proposalTerm.findFirst({
            where: { id, organizationId },
            select: { id: true },
        });

        if (!term) {
            return errorResponse("Term not found");
        }

        await prisma.proposalTerm.deleteMany({ where: { id, organizationId } });

        return successResponse("Term deleted successfully");
    } catch (error) {
        if (process.env.NODE_ENV === "development") {
            console.error(error);
        }
        return errorResponse("Failed to delete term", getErrorMessage(error));
    }
}
