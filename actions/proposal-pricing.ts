"use server";

import { errorResponse, successResponse, ActionResponse } from "@/lib/action-response";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getErrorMessage } from "@/lib/schemas/prisma-utils";
import {
  importServicePackageSchema,
  proposalServiceEditSchema,
  proposalLineItemEditSchema,
  customLineItemCreateSchema,
  proposalTotalsUpdateSchema,
  ImportServicePackageSchema,
  ProposalServiceEditSchema,
  ProposalLineItemEditSchema,
  CustomLineItemCreateSchema,
  ProposalTotalsUpdateSchema,
} from "@/lib/schemas/proposal-pricing-schema";
import { headers } from "next/headers";
import { Prisma } from "@/app/generated/prisma/client";

async function checkPermission(permission: "read" | "create" | "update" | "delete") {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user) {
    return { success: false, error: "You are not authenticated" };
  }

  const hasPermission = await auth.api.userHasPermission({
    headers: await headers(),
    body: {
      permissions: {
        proposals: [permission],
      },
    },
  });

  if (!hasPermission.success) {
    return { success: false, error: `You don't have permission to ${permission} proposal pricing` };
  }

  return { success: true, session };
}

function calculateItemFinancials(
  quantity: number,
  unitPrice: number,
  discountType?: string | null,
  discountValue?: number | null,
  taxRate: number = 18
) {
  const base = quantity * unitPrice;
  let discount = 0;
  if (discountValue && discountValue > 0) {
    if (discountType === "PERCENTAGE") {
      discount = base * (discountValue / 100);
    } else {
      discount = discountValue;
    }
  }
  const taxable = Math.max(0, base - discount);
  const tax = taxable * (taxRate / 100);
  const total = taxable + tax;
  return { base, discount, taxable, tax, total };
}

async function recalculateAndSaveTotals(proposalId: string, tx: Prisma.TransactionClient) {
  const proposal = await tx.proposal.findUnique({
    where: { id: proposalId },
    select: { currency: true },
  });
  const isUSD = proposal?.currency === "USD";

  const proposalServices = await tx.proposalService.findMany({
    where: { proposalId },
    include: { items: true },
  });

  let subtotal = 0;
  let totalDiscount = 0;
  let totalTax = 0;
  for (const service of proposalServices) {
    for (const item of service.items) {
      const effectiveTaxRate = isUSD ? 0 : (item.taxRate ?? 18);
      const fin = calculateItemFinancials(
        item.quantity,
        item.unitPrice.toNumber(),
        item.discountType,
        item.discountValue ? item.discountValue.toNumber() : 0,
        effectiveTaxRate
      );
      subtotal += fin.base;
      totalDiscount += fin.discount;
      totalTax += isUSD ? 0 : fin.tax;
    }
  }

  const cleanNum = (n: number) => (isNaN(n) || !isFinite(n) ? 0 : n);
  subtotal = cleanNum(subtotal);
  totalDiscount = cleanNum(totalDiscount);
  totalTax = cleanNum(totalTax);

  const exactTotal = subtotal - totalDiscount + totalTax;
  const roundedGrandTotal = cleanNum(Math.round(exactTotal));
  const roundOff = cleanNum(Number((roundedGrandTotal - exactTotal).toFixed(2)));

  const updatedProposal = await tx.proposal.update({
    where: { id: proposalId },
    data: {
      subtotal: new Prisma.Decimal(subtotal),
      discount: new Prisma.Decimal(totalDiscount),
      tax: new Prisma.Decimal(totalTax),
      roundOff: new Prisma.Decimal(roundOff),
      grandTotal: new Prisma.Decimal(roundedGrandTotal),
    },
  });

  return {
    subtotal,
    discount: totalDiscount,
    tax: totalTax,
    roundOff,
    grandTotal: roundedGrandTotal,
    updatedProposal,
  };
}

export async function getProposalPricing(proposalId: string, isPublic = false) {
  try {
    if (!isPublic) {
      const perm = await checkPermission("read");
      if (!perm.success) return errorResponse(perm.error!);
    }

    // Totals are now only calculated on mutations to prevent transaction timeouts during fetches

    const proposal = await prisma.proposal.findUnique({
      where: { id: proposalId },
      include: {
        customer: {
          select: {
            id: true,
            displayName: true,
            companyName: true,
            primaryContactEmail: true,
            primaryContactPhone: true,
            addressLine1: true,
            addressLine2: true,
            city: true,
            state: true,
            postalCode: true,
            country: true,
            gstNumber: true,
          },
        },
        template: true,
        proposalServices: {
          orderBy: { sortOrder: "asc" },
          include: {
            items: {
              orderBy: { sortOrder: "asc" },
            },
            features: {
              orderBy: { sortOrder: "asc" },
            },
          },
        },
      },
    });

    if (!proposal) {
      return errorResponse("Proposal not found");
    }

    // Fetch active service names for the cover footer fallback
    const activeServices = await prisma.service.findMany({
      where: { isActive: true, deletedAt: null },
      select: { name: true },
      orderBy: { name: 'asc' }
    });
    const activeServiceNames = activeServices.map(s => s.name);

    const company = await prisma.company.findFirst({
      include: { bankAccounts: true },
    });

    const serialized = {
      ...proposal,
      exchangeRate: proposal.exchangeRate ? proposal.exchangeRate.toNumber() : 83.50,
      subtotal: proposal.subtotal.toNumber(),
      discount: proposal.discount.toNumber(),
      tax: proposal.tax.toNumber(),
      roundOff: proposal.roundOff.toNumber() ?? 0,
      grandTotal: proposal.grandTotal.toNumber(),
      proposalServices: proposal.proposalServices.map((service) => ({
        ...service,
        items: service.items.map((item) => ({
          ...item,
          unitPrice: item.unitPrice.toNumber(),
          total: item.total.toNumber(),
          discountValue: item.discountValue ? item.discountValue.toNumber() : null,
          taxRate: proposal.currency === "USD" ? 0 : (item.taxRate ?? 18),
          sacCode: item.sacCode || "9983",
        })),
      })),
      activeServiceNames,
      company,
    };

    return successResponse("Fetched proposal pricing", serialized);
  } catch (error) {
    if (process.env.NODE_ENV === "development") console.error(error);
    return errorResponse("Failed to fetch proposal pricing", getErrorMessage(error));
  }
}

export async function importServicePackageToProposal(data: ImportServicePackageSchema) {
  try {
    const perm = await checkPermission("update");
    if (!perm.success) return errorResponse(perm.error!);

    const validated = importServicePackageSchema.safeParse(data);
    if (!validated.success) {
      return errorResponse("Invalid import data", validated.error.issues);
    }

    const { proposalId, serviceId, packageId, customName } = validated.data;

    const service = await prisma.service.findUnique({
      where: { id: serviceId },
    });
    if (!service) return errorResponse("Selected service not found");

    const servicePackage = await prisma.servicePackage.findUnique({
      where: { id: packageId },
      include: {
        items: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });
    if (!servicePackage) return errorResponse("Selected package not found");

    const result = await prisma.$transaction(async (tx) => {
      const maxServiceOrder = await tx.proposalService.aggregate({
        where: { proposalId },
        _max: { sortOrder: true },
      });
      const nextServiceOrder = (maxServiceOrder._max.sortOrder ?? -1) + 1;

      const createdService = await tx.proposalService.create({
        data: {
          proposalId,
          serviceId: service.id,
          serviceName: customName && customName.trim() ? customName.trim() : service.name,
          packageId: servicePackage.id,
          packageName: servicePackage.name,
          description: servicePackage.description,
          sortOrder: nextServiceOrder,
        },
      });

      const proposal = await tx.proposal.findUnique({
        where: { id: proposalId },
        select: { currency: true }
      });
      const isUSD = proposal?.currency === "USD";

      if (servicePackage.items.length > 0) {
        const lineItemsData = servicePackage.items.map((item, idx) => {
          const unitPriceNum = isUSD ? item.unitPriceUSD.toNumber() : item.unitPrice.toNumber();
          const totalNum = unitPriceNum * item.quantity;
          return {
            proposalServiceId: createdService.id,
            packageItemId: item.id,
            name: item.name,
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            unitPrice: new Prisma.Decimal(unitPriceNum),
            total: new Prisma.Decimal(totalNum),
            billingCycle: item.billingCycle,
            sortOrder: item.sortOrder || idx,
            isCustom: false,
            taxRate: 18,
            sacCode: item.sacCode || servicePackage.sacCode || "9983",
            discountType: null,
            discountValue: null,
          };
        });

        await tx.proposalLineItem.createMany({
          data: lineItemsData,
        });
      }

      await recalculateAndSaveTotals(proposalId, tx);

      return createdService;
    });

    return successResponse("Package imported into proposal successfully", { id: result.id });
  } catch (error) {
    if (process.env.NODE_ENV === "development") console.error(error);
    return errorResponse("Failed to import package", getErrorMessage(error));
  }
}

export async function updateProposalLineItem(data: ProposalLineItemEditSchema) {
  try {
    const perm = await checkPermission("update");
    if (!perm.success) return errorResponse(perm.error!);

    const validated = proposalLineItemEditSchema.safeParse(data);
    if (!validated.success) {
      return errorResponse("Invalid item update data", validated.error.issues);
    }

    const {
      id,
      proposalId,
      name,
      description,
      quantity,
      unit,
      unitPrice,
      billingCycle,
      sortOrder,
      discountType,
      discountValue,
      taxRate,
      sacCode,
    } = validated.data;

    const proposal = await prisma.proposal.findUnique({
      where: { id: proposalId },
      select: { currency: true },
    });
    const effectiveTaxRate = proposal?.currency === "USD" ? 0 : (taxRate ?? 18);

    const fin = calculateItemFinancials(quantity, unitPrice, discountType, discountValue, effectiveTaxRate);

    await prisma.$transaction(async (tx) => {
      await tx.proposalLineItem.update({
        where: { id },
        data: {
          name,
          description: description || null,
          quantity,
          ...(unit ? { unit } : {}),
          unitPrice: new Prisma.Decimal(unitPrice),
          total: new Prisma.Decimal(fin.total),
          billingCycle,
          ...(sortOrder !== undefined ? { sortOrder } : {}),
          discountType: discountType || null,
          discountValue: discountValue !== undefined && discountValue !== null ? new Prisma.Decimal(discountValue) : null,
          taxRate: effectiveTaxRate,
          sacCode: sacCode || "9983",
        },
      });

      await recalculateAndSaveTotals(proposalId, tx);
    });

    return successResponse("Line item updated successfully");
  } catch (error) {
    if (process.env.NODE_ENV === "development") console.error(error);
    return errorResponse("Failed to update line item", getErrorMessage(error));
  }
}

export async function addCustomLineItem(data: CustomLineItemCreateSchema) {
  try {
    const perm = await checkPermission("update");
    if (!perm.success) return errorResponse(perm.error!);

    const validated = customLineItemCreateSchema.safeParse(data);
    if (!validated.success) {
      return errorResponse("Invalid custom item data", validated.error.issues);
    }

    const {
      proposalServiceId,
      proposalId,
      name,
      description,
      quantity,
      unit,
      unitPrice,
      billingCycle,
      discountType,
      discountValue,
      taxRate,
      sacCode,
    } = validated.data;

    const proposal = await prisma.proposal.findUnique({
      where: { id: proposalId },
      select: { currency: true },
    });
    const effectiveTaxRate = proposal?.currency === "USD" ? 0 : (taxRate ?? 18);

    const fin = calculateItemFinancials(quantity, unitPrice, discountType, discountValue, effectiveTaxRate);

    const maxOrder = await prisma.proposalLineItem.aggregate({
      where: { proposalServiceId },
      _max: { sortOrder: true },
    });
    const nextOrder = (maxOrder._max.sortOrder ?? -1) + 1;

    const newItem = await prisma.$transaction(async (tx) => {
      const created = await tx.proposalLineItem.create({
        data: {
          proposalServiceId,
          packageItemId: null,
          name,
          description: description || null,
          quantity,
          unit,
          unitPrice: new Prisma.Decimal(unitPrice),
          total: new Prisma.Decimal(fin.total),
          billingCycle,
          sortOrder: nextOrder,
          isCustom: true,
          discountType: discountType || null,
          discountValue: discountValue !== undefined && discountValue !== null ? new Prisma.Decimal(discountValue) : null,
          taxRate: effectiveTaxRate,
          sacCode: sacCode || "9983",
        },
      });

      await recalculateAndSaveTotals(proposalId, tx);
      return created;
    });

    return successResponse("Custom item added successfully", { id: newItem.id });
  } catch (error) {
    if (process.env.NODE_ENV === "development") console.error(error);
    return errorResponse("Failed to add custom item", getErrorMessage(error));
  }
}

export async function deleteProposalLineItem(itemId: string, proposalId: string) {
  try {
    const perm = await checkPermission("update");
    if (!perm.success) return errorResponse(perm.error!);

    await prisma.$transaction(async (tx) => {
      await tx.proposalLineItem.delete({
        where: { id: itemId },
      });

      await recalculateAndSaveTotals(proposalId, tx);
    });

    return successResponse("Item deleted successfully");
  } catch (error) {
    if (process.env.NODE_ENV === "development") console.error(error);
    return errorResponse("Failed to delete item", getErrorMessage(error));
  }
}

export async function deleteProposalService(serviceId: string, proposalId: string) {
  try {
    const perm = await checkPermission("update");
    if (!perm.success) return errorResponse(perm.error!);

    await prisma.$transaction(async (tx) => {
      await tx.proposalService.delete({
        where: { id: serviceId },
      });

      await recalculateAndSaveTotals(proposalId, tx);
    });

    return successResponse("Service section deleted successfully");
  } catch (error) {
    if (process.env.NODE_ENV === "development") console.error(error);
    return errorResponse("Failed to delete service section", getErrorMessage(error));
  }
}

export async function updateProposalService(
  serviceId: string,
  proposalId: string,
  data: { serviceName: string; description?: string | null }
) {
  try {
    const perm = await checkPermission("update");
    if (!perm.success) return errorResponse(perm.error!);

    const validated = proposalServiceEditSchema.safeParse({
      proposalServiceId: serviceId,
      proposalId,
      ...data,
    });
    if (!validated.success) {
      return errorResponse("Invalid section data", validated.error.issues);
    }

    await prisma.proposalService.update({
      where: { id: serviceId },
      data: {
        serviceName: validated.data.serviceName.trim(),
        description: validated.data.description?.trim() ?? null,
      },
    });

    return successResponse("Service section updated successfully");
  } catch (error) {
    if (process.env.NODE_ENV === "development") console.error(error);
    return errorResponse("Failed to update service section", getErrorMessage(error));
  }
}

export async function reorderProposalLineItems(
  proposalId: string,
  items: { id: string; sortOrder: number }[]
) {
  try {
    const perm = await checkPermission("update");
    if (!perm.success) return errorResponse(perm.error!);

    await prisma.$transaction(async (tx) => {
      for (const item of items) {
        await tx.proposalLineItem.update({
          where: { id: item.id },
          data: { sortOrder: item.sortOrder },
        });
      }
    });

    return successResponse("Items reordered successfully");
  } catch (error) {
    if (process.env.NODE_ENV === "development") console.error(error);
    return errorResponse("Failed to reorder items", getErrorMessage(error));
  }
}

export async function reorderProposalServices(
  proposalId: string,
  services: { id: string; sortOrder: number }[]
) {
  try {
    const perm = await checkPermission("update");
    if (!perm.success) return errorResponse(perm.error!);

    await prisma.$transaction(async (tx) => {
      for (const svc of services) {
        await tx.proposalService.update({
          where: { id: svc.id },
          data: { sortOrder: svc.sortOrder },
        });
      }
    });

    return successResponse("Services reordered successfully");
  } catch (error) {
    if (process.env.NODE_ENV === "development") console.error(error);
    return errorResponse("Failed to reorder services", getErrorMessage(error));
  }
}

export async function updateProposalTotals(data: ProposalTotalsUpdateSchema) {
  try {
    const perm = await checkPermission("update");
    if (!perm.success) return errorResponse(perm.error!);

    const validated = proposalTotalsUpdateSchema.safeParse(data);
    if (!validated.success) {
      return errorResponse("Invalid totals data", validated.error.issues);
    }

    const { proposalId, discount, tax } = validated.data;

    await prisma.$transaction(async (tx) => {
      await tx.proposal.update({
        where: { id: proposalId },
        data: {
          discount: new Prisma.Decimal(discount),
          tax: new Prisma.Decimal(tax),
        },
      });

      await recalculateAndSaveTotals(proposalId, tx);
    });

    return successResponse("Proposal totals updated successfully");
  } catch (error) {
    if (process.env.NODE_ENV === "development") console.error(error);
    return errorResponse("Failed to update proposal totals", getErrorMessage(error));
  }
}
