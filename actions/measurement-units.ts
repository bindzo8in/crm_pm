"use server";

import { z } from "zod";
import prisma from "@/lib/prisma";
import {
  DEFAULT_MEASUREMENT_UNITS,
  UQC_OPTIONS,
} from "@/lib/measurement-units";
import {
  checkOrganizationPermission,
  getActiveOrganizationId,
  hasOrganizationPermission,
} from "@/lib/organization-authorization";
import { errorResponse, successResponse } from "@/lib/action-response";
import { getErrorMessage } from "@/lib/schemas/prisma-utils";
import { headers } from "next/headers";

const uqcCodeSchema = z
  .string()
  .max(3)
  .refine(
    (code) => UQC_OPTIONS.some((option) => option.code === code),
    "Choose a UQC code from the list",
  )
  .nullable();

const unitFieldsSchema = z.object({
  name: z.string().trim().min(1, "Unit name is required").max(40),
  uqcCode: uqcCodeSchema.optional(),
});

const updateUnitSchema = unitFieldsSchema.extend({
  id: z.string().min(1),
});

const unitIdSchema = z.object({ id: z.string().min(1) });

async function canReadUnitCatalog() {
  const permission = await checkOrganizationPermission({
    headers: await headers(),
    body: { permissions: { referenceData: ["read"] } },
  });
  return permission.success;
}

async function canManageUnitCatalog() {
  return hasOrganizationPermission("referenceData", "manage");
}

async function getLegacyUnitNames(organizationId: string) {
  const [products, packageItems, proposalItems, invoiceItems] =
    await prisma.$transaction([
      prisma.product.findMany({
        where: { organizationId },
        select: { unit: true },
        distinct: ["unit"],
      }),
      prisma.servicePackageItem.findMany({
        where: { package: { service: { organizationId } } },
        select: { unit: true },
        distinct: ["unit"],
      }),
      prisma.proposalLineItem.findMany({
        where: { proposalService: { proposal: { organizationId } } },
        select: { unit: true },
        distinct: ["unit"],
      }),
      prisma.invoiceLineItem.findMany({
        where: { invoice: { organizationId } },
        select: { unit: true },
        distinct: ["unit"],
      }),
    ]);

  return new Set(
    [...products, ...packageItems, ...proposalItems, ...invoiceItems]
      .map(({ unit }) => unit)
      .filter((unit) => unit.trim().length > 0),
  );
}

async function countUnitUsage(organizationId: string, name: string) {
  const unitFilter = { equals: name, mode: "insensitive" as const };
  const [products, packageItems, proposalItems, invoiceItems] =
    await prisma.$transaction([
      prisma.product.count({
        where: { organizationId, unit: unitFilter },
      }),
      prisma.servicePackageItem.count({
        where: {
          unit: unitFilter,
          package: { service: { organizationId } },
        },
      }),
      prisma.proposalLineItem.count({
        where: {
          unit: unitFilter,
          proposalService: { proposal: { organizationId } },
        },
      }),
      prisma.invoiceLineItem.count({
        where: { unit: unitFilter, invoice: { organizationId } },
      }),
    ]);

  return products + packageItems + proposalItems + invoiceItems;
}

export async function getMeasurementUnits() {
  try {
    if (!(await canReadUnitCatalog())) {
      return errorResponse("You don't have permission to view measurement units");
    }

    const organizationId = await getActiveOrganizationId();
    if (!organizationId) {
      return errorResponse("Choose an organization to view measurement units");
    }

    const legacyNames = await getLegacyUnitNames(organizationId);
    const defaultNames = new Set(
      DEFAULT_MEASUREMENT_UNITS.map(({ name }) => name.toLocaleLowerCase()),
    );
    const legacyUnits = [...legacyNames]
      .filter((name) => !defaultNames.has(name.toLocaleLowerCase()))
      .map((name) => ({ organizationId, name, uqcCode: null }));

    await prisma.measurementUnit.createMany({
      data: [
        ...DEFAULT_MEASUREMENT_UNITS.map((unit) => ({
          organizationId,
          ...unit,
        })),
        ...legacyUnits,
      ],
      skipDuplicates: true,
    });

    const [units, canManage] = await Promise.all([
      prisma.measurementUnit.findMany({
        where: { organizationId },
        orderBy: { name: "asc" },
        select: { id: true, name: true, uqcCode: true },
      }),
      canManageUnitCatalog(),
    ]);

    return successResponse("Measurement units loaded", { units, canManage });
  } catch (error) {
    return errorResponse("Measurement units could not be loaded", getErrorMessage(error));
  }
}

export async function createMeasurementUnit(input: unknown) {
  try {
    const permission = await canManageUnitCatalog();
    if (!permission) return errorResponse("You don't have permission to manage measurement units");

    const organizationId = await getActiveOrganizationId();
    if (!organizationId) {
      return errorResponse("Choose an organization before adding a measurement unit");
    }

    const validated = unitFieldsSchema.safeParse(input);
    if (!validated.success) {
      return errorResponse("Invalid measurement unit", validated.error.issues);
    }

    const duplicate = await prisma.measurementUnit.findFirst({
      where: {
        organizationId,
        name: { equals: validated.data.name, mode: "insensitive" },
      },
      select: { id: true },
    });
    if (duplicate) return errorResponse("A unit with this name already exists");

    await prisma.measurementUnit.create({
      data: {
        organizationId,
        name: validated.data.name,
        uqcCode: validated.data.uqcCode ?? null,
      },
    });
    return successResponse("Measurement unit added");
  } catch (error) {
    return errorResponse("Measurement unit could not be added", getErrorMessage(error));
  }
}

export async function updateMeasurementUnit(input: unknown) {
  try {
    const permission = await canManageUnitCatalog();
    if (!permission) return errorResponse("You don't have permission to manage measurement units");

    const organizationId = await getActiveOrganizationId();
    if (!organizationId) {
      return errorResponse("Choose an organization before updating a measurement unit");
    }

    const validated = updateUnitSchema.safeParse(input);
    if (!validated.success) {
      return errorResponse("Invalid measurement unit", validated.error.issues);
    }

    const existing = await prisma.measurementUnit.findFirst({
      where: { id: validated.data.id, organizationId },
      select: { id: true, name: true },
    });
    if (!existing) return errorResponse("Measurement unit not found");

    if (existing.name !== validated.data.name) {
      const usageCount = await countUnitUsage(organizationId, existing.name);
      if (usageCount > 0) {
        return errorResponse(
          "This unit name is already saved on products, packages, proposals, or invoices. Keep it for history and add a new unit instead.",
        );
      }
    }

    const duplicate = await prisma.measurementUnit.findFirst({
      where: {
        organizationId,
        id: { not: existing.id },
        name: { equals: validated.data.name, mode: "insensitive" },
      },
      select: { id: true },
    });
    if (duplicate) return errorResponse("A unit with this name already exists");

    await prisma.measurementUnit.update({
      where: { id: existing.id },
      data: {
        name: validated.data.name,
        uqcCode: validated.data.uqcCode ?? null,
      },
    });
    return successResponse("Measurement unit updated");
  } catch (error) {
    return errorResponse("Measurement unit could not be updated", getErrorMessage(error));
  }
}

export async function deleteMeasurementUnit(input: unknown) {
  try {
    const permission = await canManageUnitCatalog();
    if (!permission) return errorResponse("You don't have permission to manage measurement units");

    const organizationId = await getActiveOrganizationId();
    if (!organizationId) {
      return errorResponse("Choose an organization before deleting a measurement unit");
    }

    const validated = unitIdSchema.safeParse(input);
    if (!validated.success) {
      return errorResponse("Invalid measurement unit", validated.error.issues);
    }

    const unit = await prisma.measurementUnit.findFirst({
      where: { id: validated.data.id, organizationId },
      select: { id: true, name: true },
    });
    if (!unit) return errorResponse("Measurement unit not found");

    if ((await countUnitUsage(organizationId, unit.name)) > 0) {
      return errorResponse(
        "This unit is already used by existing products, packages, proposals, or invoices and cannot be deleted.",
      );
    }

    await prisma.measurementUnit.delete({ where: { id: unit.id } });
    return successResponse("Measurement unit deleted");
  } catch (error) {
    return errorResponse("Measurement unit could not be deleted", getErrorMessage(error));
  }
}
