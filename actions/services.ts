"use server";

import { Prisma } from "@/app/generated/prisma/client";
import { ActionResponse, errorResponse, successResponse } from "@/lib/action-response";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getErrorMessage } from "@/lib/schemas/prisma-utils";
import { ServiceQuerySchema, serviceSchema, ServiceSchema } from "@/lib/schemas/service-schema";
import { headers } from "next/headers";
import slugify from "slugify";

export async function CreateService(data: ServiceSchema): Promise<ActionResponse> {
    try {
        const hasPermission = await auth.api.userHasPermission({
            headers: await headers(),
            body: {
                permissions: {
                    services: ["create"]
                }
            }
        })
        if (!hasPermission.success) {
            return errorResponse(
                "You don't have permission to create a service"
            );
        }
        const validatedData = serviceSchema.safeParse(data)
        if (!validatedData.success) {
            return errorResponse(
                "Invalid data provided",
                validatedData.error?.issues
            );
        }
        const slug = slugify(validatedData.data.name, {
            lower: true,
            strict: true,
            trim: true,
        });
        const existingService = await prisma.service.findUnique({
            where: {
                slug
            }
        })
        if (existingService && !existingService.deletedAt) {
            return errorResponse("Service already exists");
        }
        if (existingService && existingService.deletedAt) {
            await prisma.service.update({
                where: {
                    id: existingService.id
                },
                data: {
                    deletedAt: null,
                    name: validatedData.data.name,
                    slug,
                    description: validatedData.data.description,
                    isActive: validatedData.data.isActive
                }
            })

            return successResponse(
                "Previously deleted service restored"
            );
        }

        await prisma.service.create({
            data: {
                name: validatedData.data.name,
                slug,
                description: validatedData.data.description,
            }
        })
        return successResponse("Service created successfully");
    } catch (error) {
        if (process.env.NODE_ENV === "development") {
            console.error(error);
        }
        return errorResponse(
            "Failed to create service",
            getErrorMessage(error)
        );
    }
}

export async function EditService(data: ServiceSchema) {
    try {
        const hasPermission = await auth.api.userHasPermission({
            headers: await headers(),
            body: {
                permissions: {
                    services: ["update"],
                },
            },
        });
        if (!hasPermission.success) {
            return errorResponse(
                "You don't have permission to update a service"
            );
        }
        const validatedData = serviceSchema.safeParse(data);
        if (!validatedData.success) {
            return errorResponse(
                "Invalid data provided",
                validatedData.error?.issues
            );
        }
        const { id, name, description } = validatedData.data;
        const service = await prisma.service.findUnique({
            where: { id },
            select: { id: true },
        });
        if (!service) {
            return errorResponse("Service not found");
        }
        const slug = slugify(name, {
            lower: true,
            strict: true,
            trim: true,
        });
        const duplicateSlug = await prisma.service.findFirst({
            where: {
                slug,
                deletedAt: null,
                NOT: {
                    id,
                },
            },
            select: {
                id: true,
            },
        });
        if (duplicateSlug) {
            return errorResponse("Service already exists");
        }

        await prisma.service.update({
            where: { id },
            data: {
                name,
                slug,
                description,
            },
        });

        return successResponse("Service updated successfully");
    } catch (error) {
        if (process.env.NODE_ENV === "development") {
            console.error(error);
        }

        return errorResponse(
            "Failed to update service",
            getErrorMessage(error)
        );
    }
}

export async function GetService(id: string) {
    try {

        const service = await prisma.service.findUnique({
            where: { id },
            select: { id: true, name: true, description: true, isActive: true },
        });

        if (!service) {
            return errorResponse("Service not found");
        }

        return successResponse("Service found", service);
    } catch (error) {
        if (process.env.NODE_ENV === "development") {
            console.error(error);
        }

        return errorResponse(
            "Failed to get service",
            getErrorMessage(error)
        );
    }
}

export async function GetServices(query: ServiceQuerySchema) {
    try {

        const {
            page,
            pageSize,
            search,
            sortDirection,
            isActive
        } = query;

        const where: Prisma.ServiceWhereInput = {
            deletedAt: null,
            ...(search && {
                name: {
                    contains: search,
                    mode: "insensitive" as const,
                },
            }),
            ...(isActive !== undefined && { isActive }),
        };
        const [services, total] = await prisma.$transaction([
            prisma.service.findMany({
                skip: page * pageSize,
                take: pageSize,

                select: {
                    id: true,
                    name: true,
                    description: true,
                    isActive: true,
                },

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
            prisma.service.count({
                where,
            }),
        ]);
        return successResponse("Services found", { data: services, pagination: { page, pageSize, total, pageCount: Math.ceil(total / pageSize) } });
    } catch (error) {
        if (process.env.NODE_ENV === "development") {
            console.error(error);
        }

        return errorResponse(
            "Failed to get services",
            getErrorMessage(error)
        );
    }
}

export async function DeleteService(id: string) {
    try {
        const hasPermission = await auth.api.userHasPermission({
            headers: await headers(),
            body: {
                permissions: {
                    services: ["delete"]
                }
            }
        })

        if (!hasPermission.success) {
            return errorResponse("You don't have permission to delete a service");
        }
        const service = await prisma.service.findUnique({
            where: { id },
            select: { id: true },
        });
        if (!service) {
            return errorResponse("Service not found");
        }
        await prisma.service.update({
            where: { id },
            data: {
                deletedAt: new Date(),
            },
        });
        return successResponse("Service deleted successfully");
    } catch (error) {
        if (process.env.NODE_ENV === 'development') console.log(error)

        return errorResponse(
            "An error occurred while deleting the service",
            getErrorMessage(error)
        );
    }
}