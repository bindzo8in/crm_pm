"use server";

import { Prisma } from "@/app/generated/prisma/client";
import { ActionResponse, errorResponse, successResponse } from "@/lib/action-response";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getErrorMessage } from "@/lib/schemas/prisma-utils";
import { ServicePackageQuerySchema, servicePackageSchema, ServicePackageSchema } from "@/lib/schemas/service-package";
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

export async function GetServiceNameById(id: string) {
    try {

        const service = await prisma.service.findUnique({
            where: { id },
            select: { id: true, name: true },
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
                    packages: {
                        select: {
                            id: true,
                            name: true,
                            isActive: true,
                        },
                        orderBy: {
                            createdAt: "asc",
                        },
                    },
                    _count: {
                        select: {
                            packages: true,
                        },
                    },
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

export async function createServicePackage(data: ServicePackageSchema) {
    try {

        const hasPermission = await auth.api.userHasPermission({
            headers: await headers(),
            body: {
                permissions: {
                    services: ['create']
                }
            }
        })

        if (!hasPermission.success) {
            return errorResponse("You don't have permission to create a service package");
        }

        const validatedData = servicePackageSchema.safeParse(data)

        if (!validatedData.success) {
            return errorResponse(
                "Invalid data provided",
                validatedData.error?.issues
            );
        }

        const { name, description, serviceId, items, features, sacCode } = validatedData.data

        const totalPrice = items.reduce(
            (sum, item) => sum + item.unitPrice * item.quantity,
            0
        );
        const totalPriceUSD = items.reduce(
            (sum, item) => sum + item.unitPriceUSD * item.quantity,
            0
        );
        await prisma.servicePackage.create({
            data: {
                name,
                description,
                serviceId,
                totalPrice,
                totalPriceUSD,
                sacCode: sacCode || "9983",
                items: {
                    create: items.map((item, index) => ({
                        name: item.name,
                        description: item.description,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        unitPriceUSD: item.unitPriceUSD,
                        sacCode: item.sacCode || sacCode || "9983",
                        unit: item.unit,
                        billingCycle: item.billingCycle,
                        sortOrder: index,
                    })),
                },
                features: {
                    create: features.map((feature) => ({
                        content: feature.name,
                        isHeading: feature.isHeading,
                        sortOrder: feature.sortOrder
                    })),
                },
            },
        });
        return successResponse("Service package created successfully");
    } catch (error) {
        if (process.env.NODE_ENV === 'development') console.log(error)

        return errorResponse(
            "An error occurred while creating the service package",
            getErrorMessage(error)
        );
    }
}

export async function editServicePackage(
    id: string,
    data: ServicePackageSchema
) {
    try {
        const hasPermission =
            await auth.api.userHasPermission({
                headers: await headers(),
                body: {
                    permissions: {
                        services: ["update"],
                    },
                },
            });

        if (!hasPermission.success) {
            return errorResponse(
                "You don't have permission to update service packages"
            );
        }

        const validatedData =
            servicePackageSchema.safeParse(data);

        if (!validatedData.success) {
            return errorResponse(
                "Invalid data provided",
                validatedData.error.issues
            );
        }

        const {
            name,
            description,
            serviceId,
            items,
            features,
            isActive,
            isPopular,
            sacCode
        } = validatedData.data;

        const totalPrice = items.reduce(
            (sum, item) => sum + item.unitPrice * item.quantity,
            0
        );

        const totalPriceUSD = items.reduce(
            (sum, item) => sum + item.unitPriceUSD * item.quantity,
            0
        );

        const debug =
            process.env.NODE_ENV === "development";

        await prisma.$transaction(async (tx) => {
            if (debug) {
                console.log(
                    "\n========== EDIT SERVICE PACKAGE =========="
                );
                console.log("Package ID:", id);
            }

            const existingPackage = await tx.servicePackage.findUnique({
                where: { id },
                include: {
                    items: true,
                    features: true,
                },
            });

            if (!existingPackage) {
                throw new Error("Service package not found");
            }

            const hasPackageChanged =
                existingPackage.name !== name ||
                existingPackage.description !== description ||
                existingPackage.serviceId !== serviceId ||
                existingPackage.isActive !== isActive ||
                existingPackage.isPopular !== isPopular ||
                existingPackage.sacCode !== sacCode ||
                existingPackage.totalPrice.toNumber() !== totalPrice ||
                existingPackage.totalPriceUSD.toNumber() !== totalPriceUSD;

            if (hasPackageChanged) {
                await tx.servicePackage.update({
                    where: { id },
                    data: {
                        name,
                        description,
                        serviceId,
                        isActive,
                        isPopular,
                        sacCode: sacCode || "9983",
                        totalPrice,
                        totalPriceUSD,
                    },
                });
                if (debug) {
                    console.log("✓ Package updated");
                }
            } else if (debug) {
                console.log("✓ Package unchanged (skipped)");
            }

            const itemIdsFromForm = items
                .filter((item) => item.id)
                .map((item) => item.id!);

            const featureIdsFromForm = features
                .filter((feature) => feature.id)
                .map((feature) => feature.id!);

            if (debug) {
                console.log("Item IDs From Form:", itemIdsFromForm);
                console.log("Feature IDs From Form:", featureIdsFromForm);
            }

            // Delete removed items
            const existingItemIds = existingPackage.items.map(item => item.id);
            const itemsToDelete = existingItemIds.filter(itemId => !itemIdsFromForm.includes(itemId));

            if (itemsToDelete.length > 0) {
                const deletedItems = await tx.servicePackageItem.deleteMany({
                    where: {
                        id: { in: itemsToDelete },
                    },
                });
                if (debug) console.log(`✓ Deleted ${deletedItems.count} items`);
            }

            // Delete removed features
            const existingFeatureIds = existingPackage.features.map(f => f.id);
            const featuresToDelete = existingFeatureIds.filter(featureId => !featureIdsFromForm.includes(featureId));

            if (featuresToDelete.length > 0) {
                const deletedFeatures = await tx.packageFeature.deleteMany({
                    where: {
                        id: { in: featuresToDelete },
                    },
                });
                if (debug) console.log(`✓ Deleted ${deletedFeatures.count} features`);
            }

            const updateItemPromises = items
                .map((item, index) => {
                    if (!item.id) return null;
                    const existingItem = existingPackage.items.find(i => i.id === item.id);
                    if (!existingItem) return null;

                    const hasItemChanged =
                        existingItem.name !== item.name ||
                        existingItem.description !== item.description ||
                        existingItem.quantity !== item.quantity ||
                        existingItem.unitPrice.toNumber() !== item.unitPrice ||
                        existingItem.unitPriceUSD.toNumber() !== item.unitPriceUSD ||
                        existingItem.sacCode !== item.sacCode ||
                        existingItem.unit !== item.unit ||
                        existingItem.billingCycle !== item.billingCycle ||
                        existingItem.sortOrder !== index;

                    if (!hasItemChanged) return null;

                    return tx.servicePackageItem.update({
                        where: {
                            id: item.id,
                        },
                        data: {
                            name: item.name,
                            description: item.description,
                            quantity: item.quantity,
                            unitPrice: item.unitPrice,
                            unitPriceUSD: item.unitPriceUSD,
                            sacCode: item.sacCode || sacCode || "9983",
                            unit: item.unit,
                            billingCycle: item.billingCycle,
                            sortOrder: index,
                        },
                    });
                })
                .filter(Boolean);

            if (updateItemPromises.length) {
                await Promise.all(updateItemPromises);
                if (debug) {
                    console.log(`✓ Updated ${updateItemPromises.length} items`);
                }
            }

            const newItems = items
                .map((item, index) => ({
                    ...item,
                    sortOrder: index,
                }))
                .filter((item) => !item.id);

            if (newItems.length) {
                const created = await tx.servicePackageItem.createMany({
                    data: newItems.map((item) => ({
                        packageId: id,
                        name: item.name,
                        description: item.description,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        unitPriceUSD: item.unitPriceUSD,
                        sacCode: item.sacCode || sacCode || "9983",
                        unit: item.unit,
                        billingCycle: item.billingCycle,
                        sortOrder: item.sortOrder,
                    })),
                });
                if (debug) console.log(`✓ Created ${created.count} items`);
            }

            const updateFeaturePromises = features
                .map((feature, index) => {
                    if (!feature.id) return null;
                    const existingFeature = existingPackage.features.find(f => f.id === feature.id);
                    if (!existingFeature) return null;

                    const hasFeatureChanged =
                        existingFeature.content !== feature.name ||
                        existingFeature.isHeading !== feature.isHeading ||
                        existingFeature.sortOrder !== index;

                    if (!hasFeatureChanged) return null;

                    return tx.packageFeature.update({
                        where: {
                            id: feature.id,
                        },
                        data: {
                            content: feature.name,
                            isHeading: feature.isHeading,
                            sortOrder: index,
                        },
                    });
                })
                .filter(Boolean);

            if (updateFeaturePromises.length) {
                await Promise.all(updateFeaturePromises);
                if (debug) {
                    console.log(`✓ Updated ${updateFeaturePromises.length} features`);
                }
            }

            const newFeatures = features
                .map((feature, index) => ({
                    ...feature,
                    sortOrder: index,
                }))
                .filter((feature) => !feature.id);

            if (newFeatures.length) {
                const created = await tx.packageFeature.createMany({
                    data: newFeatures.map((feature) => ({
                        packageId: id,
                        content: feature.name,
                        isHeading: feature.isHeading,
                        sortOrder: feature.sortOrder,
                    })),
                });
                if (debug) console.log(`✓ Created ${created.count} features`);
            }

            if (debug) {
                console.log(
                    "========== PACKAGE UPDATED ==========\n"
                );
            }
        }, {
            maxWait: 15000,
            timeout: 30000,
        });

        return successResponse(
            "Service package updated successfully"
        );
    } catch (error) {
        if (
            process.env.NODE_ENV ===
            "development"
        ) {
            console.error(error);
        }

        return errorResponse(
            "An error occurred while updating the service package",
            getErrorMessage(error)
        );
    }
}

export async function getServicePackage(id: string) {
    try {
        const servicePackage = await prisma.servicePackage.findUnique({
            where: {
                id,
            },
            include: {
                items: true,
                features: true,
            },
        });

        const serializedPackage = servicePackage
            ? {
                ...servicePackage,
                totalPrice: servicePackage.totalPrice.toNumber(),
                totalPriceUSD: servicePackage.totalPriceUSD.toNumber(),
                items: servicePackage.items.map((item) => ({
                    ...item,
                    unitPrice: item.unitPrice.toNumber(),
                    unitPriceUSD: item.unitPriceUSD.toNumber(),
                })),
            }
            : null;

        return successResponse(
            "Service package fetched successfully",
            serializedPackage
        );
    } catch (error) {
        if (
            process.env.NODE_ENV ===
            "development"
        ) {
            console.error(error);
        }

        return errorResponse(
            "An error occurred while fetching the service package",
            getErrorMessage(error)
        );
    }
}

export async function GetServicesPackages(query: ServicePackageQuerySchema) {
    try {
        const { page, pageSize, sortDirection, search, serviceId, isPopular, isActive } = query;
        const where: Prisma.ServicePackageWhereInput = {
            ...(serviceId && { serviceId }),
            ...(isPopular != undefined && { isPopular }),
            ...(isActive != undefined && { isActive }),
            ...(search && {
                name: {
                    contains: search,
                    mode: 'insensitive'
                }
            })
        }

        const [packages, total] = await prisma.$transaction([
            prisma.servicePackage.findMany({
                skip: page * pageSize,
                take: pageSize,
                select: {
                    id: true,
                    name: true,
                    isPopular: true,
                    isActive: true,
                    items: {
                        select: {
                            id: true,
                            billingCycle: true,
                            name: true,
                            quantity: true,
                            unit: true,
                            unitPrice: true,
                            unitPriceUSD: true,
                        }
                    },
                    totalPrice: true,
                    totalPriceUSD: true,
                    service: {
                        select: {
                            id: true,
                            name: true,
                        }
                    }
                },
                where,
                orderBy: [
                    {
                        createdAt: sortDirection,
                    },
                    {
                        id: "desc"
                    }
                ]
            }),

            prisma.servicePackage.count({
                where
            })
        ]);

        return successResponse("Service Packages fetched successfully", {
            data: packages.map((pkg) => ({
                ...pkg,
                items: pkg.items.map((item) => ({
                    ...item,
                    unitPrice: item.unitPrice.toNumber(),
                    unitPriceUSD: item.unitPriceUSD.toNumber(),
                })),
                totalPrice: pkg.totalPrice.toNumber(),
                totalPriceUSD: pkg.totalPriceUSD.toNumber(),
            })),
            pagination: {
                page,
                pageSize,
                total,
                pageCount: Math.ceil(total / pageSize)
            }
        })

    } catch (error) {
        if (process.env.NODE_ENV === "development") {
            console.error(error);
        }
        return errorResponse("An error occurred while fetching the service packages", getErrorMessage(error))
    }
}

export async function updatePackageTotal(packageId: string) {
    const items = await prisma.servicePackageItem.findMany({
        where: { packageId },
        select: {
            quantity: true,
            unitPrice: true,
        },
    });

    const total = items.reduce(
        (sum, item) => sum + item.unitPrice.toNumber() * item.quantity,
        0
    );

    await prisma.servicePackage.update({
        where: { id: packageId },
        data: {
            totalPrice: total,
        },
    });
}

export async function DeleteServicePackage(id: string) {
    try {
        const hasPermission =
            await auth.api.userHasPermission({
                headers: await headers(),
                body: {
                    permissions: {
                        services: ["delete"],
                    },
                },
            });

        if (!hasPermission.success) {
            return errorResponse(
                "You don't have permission to delete service packages"
            );
        }
        await prisma.servicePackage.delete({
            where: { id },
        });

        return successResponse("Service package deleted successfully");
    } catch (error) {
        if (process.env.NODE_ENV === "development") {
            console.error(error);
        }
        return errorResponse("An error occurred while deleting the service package", getErrorMessage(error))
    }
}

export async function DuplicateServicePackage(
    id: string
): Promise<ActionResponse> {
    try {
        const hasPermission =
            await auth.api.userHasPermission({
                headers: await headers(),
                body: {
                    permissions: {
                        services: ["create"],
                    },
                },
            });

        if (!hasPermission.success) {
            return errorResponse(
                "You don't have permission to duplicate service packages"
            );
        }

        const servicePackage =
            await prisma.servicePackage.findUnique({
                where: { id },
                include: {
                    items: true,
                    features: true,
                },
            });

        if (!servicePackage) {
            return errorResponse(
                "Service package not found"
            );
        }

        await prisma.servicePackage.create({
            data: {
                serviceId: servicePackage.serviceId,

                name: `${servicePackage.name} (Copy)`,

                description:
                    servicePackage.description,

                isActive: servicePackage.isActive,

                isPopular: false,

                totalPrice:
                    servicePackage.totalPrice,

                items: {
                    create:
                        servicePackage.items.map(
                            (item) => ({
                                name: item.name,
                                description:
                                    item.description,
                                quantity:
                                    item.quantity,
                                unitPrice:
                                    item.unitPrice,
                                unit: item.unit,
                                billingCycle:
                                    item.billingCycle,
                                sortOrder:
                                    item.sortOrder,
                            })
                        ),
                },

                features: {
                    create:
                        servicePackage.features.map(
                            (feature) => ({
                                content:
                                    feature.content,
                                sortOrder:
                                    feature.sortOrder,
                                isHeading: feature.isHeading
                            })
                        ),
                },
            },
        });

        return successResponse(
            "Service package duplicated successfully"
        );
    } catch (error) {
        if (
            process.env.NODE_ENV ===
            "development"
        ) {
            console.error(error);
        }

        return errorResponse(
            "Failed to duplicate service package",
            getErrorMessage(error)
        );
    }
}

export async function GetAllActivePackages() {
    try {
        const packages = await prisma.servicePackage.findMany({
            where: {
                isActive: true,
            },
            select: {
                id: true,
                name: true,
                service: {
                    select: {
                        name: true,
                    },
                },
            },
            orderBy: [
                { service: { name: "asc" } },
                { name: "asc" },
            ],
        });

        const formattedPackages = packages.map(pkg => ({
            id: pkg.id,
            name: `${pkg.service.name} - ${pkg.name}`,
        }));

        return successResponse("Active packages found", formattedPackages);
    } catch (error) {
        if (process.env.NODE_ENV === "development") {
            console.error(error);
        }
        return errorResponse(
            "Failed to get active packages",
            getErrorMessage(error)
        );
    }
}

export async function GetAllActiveServices() {
    try {
        const services = await prisma.service.findMany({
            where: {
                deletedAt: null,
                isActive: true,
            },
            select: {
                id: true,
                name: true,
            },
            orderBy: {
                name: "asc",
            },
        });
        return successResponse("Active services found", services);
    } catch (error) {
        if (process.env.NODE_ENV === "development") {
            console.error(error);
        }
        return errorResponse(
            "Failed to get active services",
            getErrorMessage(error)
        );
    }
}

export async function GetServiceOptions(search?: string) {
    try {
        const services = await prisma.service.findMany({
            where: {
                deletedAt: null,
                isActive: true,

                ...(search
                    ? {
                        OR: [
                            {
                                name: {
                                    contains: search,
                                    mode: "insensitive",
                                },
                            },
                            {
                                description: {
                                    contains: search,
                                    mode: "insensitive",
                                },
                            },
                        ],
                    }
                    : {}),
            },

            select: {
                id: true,
                name: true,
                description: true,
            },

            orderBy: {
                name: "asc",
            },

            take: 20,
        });

        return {
            success: true,
            data: services,
        };
    } catch (error) {
        if (process.env.NODE_ENV === "development") {
            console.error(error);
        }

        throw error;
    }
}

export async function GetServicePackages(
    serviceId: string,
    search?: string,
) {
    try {
        const packages = await prisma.servicePackage.findMany({
            where: {
                serviceId,
                isActive: true,

                ...(search
                    ? {
                        OR: [
                            {
                                name: {
                                    contains: search,
                                    mode: "insensitive",
                                },
                            },
                            {
                                description: {
                                    contains: search,
                                    mode: "insensitive",
                                },
                            },
                        ],
                    }
                    : {}),
            },

            select: {
                id: true,
                name: true,
                description: true,
                totalPrice: true,
                isPopular: true,
            },

            orderBy: [
                {
                    isPopular: "desc",
                },
                {
                    name: "asc",
                },
            ],
        });

        const serializedPackages = packages.map((pkg) => ({
            ...pkg,
            totalPrice: pkg.totalPrice.toNumber(),
        }));

        return {
            success: true,
            data: serializedPackages,
        };
    } catch (error) {
        if (process.env.NODE_ENV === "development") {
            console.error(error);
        }

        throw error;
    }
}