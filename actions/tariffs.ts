"use server";

import { errorResponse, successResponse } from "@/lib/action-response";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getErrorMessage } from "@/lib/schemas/prisma-utils";
import { headers } from "next/headers";
import { z } from "zod";

async function checkPermission(permission: "read" | "create" | "update" | "delete") {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user) {
    return { success: false, error: "You are not authenticated" };
  }
  
  // Since tariffs are part of services, we'll check 'services' permissions
  const hasPermission = await auth.api.userHasPermission({
    headers: await headers(),
    body: {
      permissions: {
        services: [permission],
      },
    },
  });

  if (!hasPermission.success) {
    return { success: false, error: `You don't have permission to ${permission} tariffs` };
  }

  return { success: true, session };
}

export async function getTariffGrids() {
  try {
    const perm = await checkPermission("read");
    if (!perm.success) return errorResponse(perm.error!);

    const grids = await prisma.tariffGrid.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { packages: true }
        }
      }
    });
    return successResponse("Fetched tariff grids", grids);
  } catch (error) {
    return errorResponse("Failed to fetch tariff grids", getErrorMessage(error));
  }
}

export async function getTariffGridById(id: string) {
  try {
    const perm = await checkPermission("read");
    if (!perm.success) return errorResponse(perm.error!);

    const grid = await prisma.tariffGrid.findUnique({
      where: { id },
      include: {
        packages: {
          orderBy: { sortOrder: 'asc' },
          include: {
            package: {
              include: {
                items: {
                  orderBy: { sortOrder: 'asc' }
                },
                features: {
                  orderBy: { sortOrder: 'asc' }
                },
                service: true,
              }
            }
          }
        }
      }
    });

    if (!grid) {
      return errorResponse("Tariff Grid not found");
    }

    // Convert Decimals to numbers for client-side serialization
    const serializedGrid = {
      ...grid,
      packages: grid.packages.map(p => ({
        ...p,
        package: {
          ...p.package,
          totalPrice: p.package.totalPrice.toNumber(),
          totalPriceUSD: p.package.totalPriceUSD.toNumber(),
          items: p.package.items.map(item => ({
            ...item,
            unitPrice: item.unitPrice.toNumber(),
            unitPriceUSD: item.unitPriceUSD.toNumber(),
          }))
        }
      }))
    };

    return successResponse("Fetched tariff grid", serializedGrid);
  } catch (error) {
    return errorResponse("Failed to fetch tariff grid", getErrorMessage(error));
  }
}

const createTariffGridSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
});

export async function createTariffGrid(data: z.infer<typeof createTariffGridSchema>) {
  try {
    const perm = await checkPermission("create");
    if (!perm.success) return errorResponse(perm.error!);

    const validated = createTariffGridSchema.parse(data);

    const grid = await prisma.tariffGrid.create({
      data: {
        name: validated.name,
        description: validated.description,
      },
    });

    return successResponse("Tariff grid created successfully", grid);
  } catch (error) {
    return errorResponse("Failed to create tariff grid", getErrorMessage(error));
  }
}

export async function updateTariffGrid(id: string, data: z.infer<typeof createTariffGridSchema>) {
  try {
    const perm = await checkPermission("update");
    if (!perm.success) return errorResponse(perm.error!);

    const validated = createTariffGridSchema.parse(data);

    const grid = await prisma.tariffGrid.update({
      where: { id },
      data: {
        name: validated.name,
        description: validated.description,
      },
    });

    return successResponse("Tariff grid updated successfully", grid);
  } catch (error) {
    return errorResponse("Failed to update tariff grid", getErrorMessage(error));
  }
}

export async function deleteTariffGrid(id: string) {
  try {
    const perm = await checkPermission("delete");
    if (!perm.success) return errorResponse(perm.error!);

    await prisma.tariffGrid.delete({
      where: { id },
    });

    return successResponse("Tariff grid deleted successfully");
  } catch (error) {
    return errorResponse("Failed to delete tariff grid", getErrorMessage(error));
  }
}

export async function updateTariffGridPackages(tariffGridId: string, packages: { id: string, isStartsFrom?: boolean }[]) {
  try {
    const perm = await checkPermission("update");
    if (!perm.success) return errorResponse(perm.error!);

    // Run in transaction: delete old mappings, insert new ones
    await prisma.$transaction(async (tx) => {
      await tx.tariffGridPackage.deleteMany({
        where: { tariffGridId },
      });

      if (packages.length > 0) {
        await tx.tariffGridPackage.createMany({
          data: packages.map((pkg, index) => ({
            tariffGridId,
            packageId: pkg.id,
            isStartsFrom: pkg.isStartsFrom || false,
            sortOrder: index,
          })),
        });
      }
    });

    return successResponse("Tariff grid packages updated successfully");
  } catch (error) {
    return errorResponse("Failed to update packages", getErrorMessage(error));
  }
}

export async function getAvailableServicePackages() {
  try {
    const perm = await checkPermission("read");
    if (!perm.success) return errorResponse(perm.error!);

    const packages = await prisma.servicePackage.findMany({
      where: {
        isActive: true,
        service: { isActive: true, deletedAt: null }
      },
      include: {
        service: { select: { name: true } },
        items: { orderBy: { sortOrder: 'asc' } },
        features: { orderBy: { sortOrder: 'asc' } },
      },
      orderBy: [
        { service: { name: 'asc' } },
        { name: 'asc' }
      ]
    });

    const serializedPackages = packages.map(p => ({
      ...p,
      totalPrice: p.totalPrice.toNumber(),
      totalPriceUSD: p.totalPriceUSD.toNumber(),
      items: p.items.map(item => ({
        ...item,
        unitPrice: item.unitPrice.toNumber(),
        unitPriceUSD: item.unitPriceUSD.toNumber(),
      }))
    }));

    return successResponse("Fetched packages", serializedPackages);
  } catch (error) {
    return errorResponse("Failed to fetch packages", getErrorMessage(error));
  }
}

export async function getPublicTariffGrids() {
  try {
    const grids = await prisma.tariffGrid.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { packages: true }
        }
      }
    });
    return successResponse("Fetched public tariff grids", grids);
  } catch (error) {
    return errorResponse("Failed to fetch public tariff grids", getErrorMessage(error));
  }
}

export async function getPublicTariffGridById(id: string) {
  try {
    const grid = await prisma.tariffGrid.findUnique({
      where: { id, isActive: true },
      include: {
        packages: {
          orderBy: { sortOrder: 'asc' },
          include: {
            package: {
              include: {
                items: {
                  orderBy: { sortOrder: 'asc' }
                },
                features: {
                  orderBy: { sortOrder: 'asc' }
                },
                service: true,
              }
            }
          }
        }
      }
    });

    if (!grid) {
      return errorResponse("Tariff Grid not found");
    }

    const serializedGrid = {
      ...grid,
      packages: grid.packages.map(p => ({
        ...p,
        package: {
          ...p.package,
          totalPrice: p.package.totalPrice.toNumber(),
          totalPriceUSD: p.package.totalPriceUSD.toNumber(),
          items: p.package.items.map(item => ({
            ...item,
            unitPrice: item.unitPrice.toNumber(),
            unitPriceUSD: item.unitPriceUSD.toNumber(),
          }))
        }
      }))
    };

    return successResponse("Fetched public tariff grid", serializedGrid);
  } catch (error) {
    return errorResponse("Failed to fetch public tariff grid", getErrorMessage(error));
  }
}
