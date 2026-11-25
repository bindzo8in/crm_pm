"use server";

import { errorResponse, successResponse } from "@/lib/action-response";
import prisma from "@/lib/prisma";
import { getErrorMessage } from "@/lib/schemas/prisma-utils";
import {
  addCatalogLineItemSchema,
  importServicePackageSchema,
  proposalServiceEditSchema,
  proposalLineItemEditSchema,
  customLineItemCreateSchema,
  proposalTotalsUpdateSchema,
  ImportServicePackageSchema,
  AddCatalogLineItemSchema,
  ProposalLineItemEditSchema,
  CustomLineItemCreateSchema,
  ProposalTotalsUpdateSchema,
} from "@/lib/schemas/proposal-pricing-schema";
import { Prisma } from "@/app/generated/prisma/client";
import { BillableItemType } from "@/app/generated/prisma/enums";
import type { ProposalWhereInput } from "@/app/generated/prisma/models";
import { syncProposalComposerTermsAndFeatures } from "@/actions/proposal-composer";
import { getProposalDraftError } from "@/lib/proposal-draft";
import { getProposalPermissionScope } from "@/lib/proposal-permissions";
import { checkOrganizationPermission, getActiveOrganizationId } from "@/lib/organization-authorization";
import { headers } from "next/headers";

async function checkPermission(permission: "read" | "update", proposalId: string) {
  const access = await getProposalPermissionScope(
    permission,
    permission === "read" ? "read-own" : "update-own",
    proposalId,
  );
  return access
    ? { success: true as const, organizationId: access.organizationId }
    : { success: false as const, error: `You don't have permission to ${permission} proposal pricing` };
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

async function recalculateAndSaveTotals(
  proposalId: string,
  organizationId: string,
  tx: Prisma.TransactionClient,
) {
  const proposal = await tx.proposal.findFirst({
    where: { id: proposalId, organizationId },
    select: { currency: true },
  });
  const isUSD = proposal?.currency === "USD";

  const proposalServices = await tx.proposalService.findMany({
    where: { proposalId, proposal: { organizationId } },
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

  const updatedProposal = await tx.proposal.updateMany({
    where: { id: proposalId, organizationId },
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
    if (!proposalId.trim()) return errorResponse("Proposal ID is required.");
    let proposalWhere: ProposalWhereInput = { id: proposalId };
    if (!isPublic) {
      const access = await getProposalPermissionScope("read", "read-own", proposalId);
      if (!access) return errorResponse("You don't have permission to read proposal pricing");
      proposalWhere = access.where;
    }

    // Totals are now only calculated on mutations to prevent transaction timeouts during fetches

    const proposal = await prisma.proposal.findFirst({
      where: proposalWhere,
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
    const organizationId = proposal.organizationId;
    if (!organizationId) {
      return errorResponse("This proposal is not associated with an organization.");
    }

    const packageItemIds = [
      ...new Set(
        proposal.proposalServices.flatMap((service) =>
          service.items.flatMap((item) => (item.packageItemId ? [item.packageItemId] : []))
        )
      ),
    ];
    const packageItems = packageItemIds.length
      ? await prisma.servicePackageItem.findMany({
          where: {
            id: { in: packageItemIds },
            package: { service: { organizationId } },
          },
          select: {
            id: true,
            sacCode: true,
            package: {
              select: { sacCode: true },
            },
          },
        })
      : [];
    const packageItemsById = new Map(packageItems.map((item) => [item.id, item]));

    // Fetch services enabled for the proposal cover's Core Services list.
    const activeServices = await prisma.service.findMany({
      where: {
        organizationId,
        isActive: true,
        showInProposal: true,
        deletedAt: null,
      },
      select: { name: true },
      orderBy: { name: 'asc' }
    });
    const activeServiceNames = activeServices.map(s => s.name);

    const company = await prisma.company.findUnique({
      where: { organizationId },
      include: { bankAccounts: true },
    });

    const { assignedToId, ...proposalForOutput } = proposal;
    void assignedToId;
    const serialized = {
      ...proposalForOutput,
      exchangeRate: proposal.exchangeRate ? proposal.exchangeRate.toNumber() : 83.50,
      subtotal: proposal.subtotal.toNumber(),
      discount: proposal.discount.toNumber(),
      tax: proposal.tax.toNumber(),
      roundOff: proposal.roundOff.toNumber() ?? 0,
      grandTotal: proposal.grandTotal.toNumber(),
      proposalServices: proposal.proposalServices.map((service) => ({
        ...service,
        items: service.items.map((item) => {
          const packageItem = item.packageItemId ? packageItemsById.get(item.packageItemId) : undefined;
          const itemType = item.productId ? "GOODS" : item.itemType;
          return {
            ...item,
            unitPrice: item.unitPrice.toNumber(),
            total: item.total.toNumber(),
            discountValue: item.discountValue ? item.discountValue.toNumber() : null,
            itemType,
            taxRate: proposal.currency === "USD" ? 0 : (item.taxRate ?? 18),
            sacCode:
              packageItem?.sacCode?.trim() ||
              packageItem?.package.sacCode?.trim() ||
             item.sacCode?.trim() ||
             null,
          };
        }),
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
    const validated = importServicePackageSchema.safeParse(data);
    if (!validated.success) {
      return errorResponse("Invalid import data", validated.error.issues);
    }

    const { proposalId, serviceId, packageId, customName } = validated.data;
    const perm = await checkPermission("update", proposalId);
    if (!perm.success) return errorResponse(perm.error!);
    const draftError = await getProposalDraftError(proposalId);
    if (draftError) return errorResponse(draftError);

    const service = await prisma.service.findFirst({
      where: { id: serviceId, organizationId: perm.organizationId },
    });
    if (!service) return errorResponse("Selected service not found");

    const servicePackage = await prisma.servicePackage.findFirst({
      where: { id: packageId, service: { organizationId: perm.organizationId } },
      include: {
        items: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });
    if (!servicePackage) return errorResponse("Selected package not found");

    const result = await prisma.$transaction(async (tx) => {
      const maxServiceOrder = await tx.proposalService.aggregate({
        where: { proposalId, proposal: { organizationId: perm.organizationId } },
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
          hasItems: servicePackage.hasItems && servicePackage.items.length > 0,
          description: servicePackage.description,
          sortOrder: nextServiceOrder,
        },
      });

      const proposal = await tx.proposal.findUnique({
        where: { id: proposalId, organizationId: perm.organizationId },
        select: { currency: true }
      });
      const isUSD = proposal?.currency === "USD";

      const packageItems = servicePackage.items.length > 0
        ? servicePackage.items
        : [{
            id: null,
            name: servicePackage.name,
            description: servicePackage.description,
            quantity: 1,
            unit: "Unit",
            unitPrice: servicePackage.totalPrice,
            unitPriceUSD: servicePackage.totalPriceUSD,
            billingCycle: "MONTHLY" as const,
            sortOrder: 0,
            sacCode: servicePackage.sacCode,
          }];

      if (packageItems.length > 0) {
        const lineItemsData = packageItems.map((item, idx) => {
          const usdVal = item.unitPriceUSD.toNumber();
          const inrVal = item.unitPrice.toNumber();
          const unitPriceNum = isUSD
            ? (usdVal > 0 ? usdVal : Number((inrVal / 83.5).toFixed(2)))
            : inrVal;
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
            itemType: BillableItemType.SERVICE,
            discountType: null,
            discountValue: null,
          };
        });

        await tx.proposalLineItem.createMany({
          data: lineItemsData,
        });
      }

      await recalculateAndSaveTotals(proposalId, perm.organizationId, tx);

      return createdService;
    });

    try {
      await syncProposalComposerTermsAndFeatures(proposalId, true);
    } catch (e) {
      console.error("Composer auto-sync warning:", e);
    }

    return successResponse("Package imported into proposal successfully", { id: result.id });
  } catch (error) {
    if (process.env.NODE_ENV === "development") console.error(error);
    return errorResponse("Failed to import package", getErrorMessage(error));
  }
}

export async function addCatalogLineItemToProposal(data: AddCatalogLineItemSchema) {
  try {
    const validated = addCatalogLineItemSchema.safeParse(data);
    if (!validated.success) {
      return errorResponse("Invalid catalog item", validated.error.issues);
    }

    const { proposalId, itemType, catalogItemId } = validated.data;
    const permission = await checkPermission("update", proposalId);
    if (!permission.success) return errorResponse(permission.error!);
    const catalogPermission = await checkOrganizationPermission({
      headers: await headers(),
      body: {
        permissions:
          itemType === "product"
            ? { products: ["read"] }
            : { services: ["read"] },
      },
    });
    if (!catalogPermission.success) {
      return errorResponse("You don't have permission to select this catalog item");
    }
    const draftError = await getProposalDraftError(proposalId);
    if (draftError) return errorResponse(draftError);

    const organizationId = await getActiveOrganizationId();
    if (!organizationId) return errorResponse("Choose an organization before adding a catalog item");

    const result = await prisma.$transaction(async (tx) => {
      const proposal = await tx.proposal.findUnique({
        where: { id: proposalId, organizationId },
        select: { currency: true, exchangeRate: true, organizationId: true },
      });
      if (!proposal) throw new Error("Proposal not found");
      if (proposal.organizationId !== organizationId) {
        throw new Error("The proposal does not belong to the active organization");
      }
      const isUSD = proposal.currency === "USD";
      const exchangeRate = proposal.exchangeRate?.toNumber() || 83.5;

      let proposalServiceId: string;
      let name: string;
      let description: string | null;
      const quantity = 1;
      let unit: string;
      let unitPrice: number;
      let billingCycle: "ONE_TIME" | "MONTHLY" | "QUARTERLY" | "HALF_YEARLY" | "YEARLY";
      let taxRate: number;
      let sacCode: string | null;
      let lineItemType: "GOODS" | "SERVICE";
      let productId: string | null = null;

      if (itemType === "product") {
        const product = await tx.product.findFirst({
          where: {
            id: catalogItemId,
            organizationId,
            isActive: true,
            deletedAt: null,
          },
          select: {
            id: true,
            name: true,
            description: true,
            unit: true,
            basePrice: true,
            basePriceUSD: true,
            taxRate: true,
            hsnCode: true,
          },
        });
        if (!product) throw new Error("The selected product is no longer available");

        const productSection = await tx.proposalService.findFirst({
          where: {
            proposalId,
            proposal: { organizationId },
            serviceId: null,
            packageId: null,
            serviceName: "Products",
          },
          select: { id: true },
        });
        if (productSection) {
          proposalServiceId = productSection.id;
        } else {
          const maxServiceOrder = await tx.proposalService.aggregate({
            where: { proposalId, proposal: { organizationId } },
            _max: { sortOrder: true },
          });
          const section = await tx.proposalService.create({
            data: {
              proposalId,
              serviceName: "Products",
              description: "Products included in this proposal.",
              sortOrder: (maxServiceOrder._max.sortOrder ?? -1) + 1,
            },
            select: { id: true },
          });
          proposalServiceId = section.id;
        }

        name = product.name;
        description = product.description;
        unit = product.unit;
        const usdPrice = product.basePriceUSD.toNumber();
        unitPrice = isUSD
          ? usdPrice > 0
            ? usdPrice
            : Number((product.basePrice.toNumber() / exchangeRate).toFixed(2))
          : product.basePrice.toNumber();
        billingCycle = "ONE_TIME";
        taxRate = isUSD ? 0 : product.taxRate;
        sacCode = product.hsnCode;
        lineItemType = "GOODS";
        productId = product.id;
      } else {
        const servicePackage = await tx.servicePackage.findFirst({
          where: {
            id: catalogItemId,
            isActive: true,
            service: { organizationId, isActive: true, deletedAt: null },
          },
          select: {
            id: true,
            name: true,
            description: true,
            totalPrice: true,
            totalPriceUSD: true,
            sacCode: true,
            serviceId: true,
            service: { select: { name: true } },
            items: { select: { billingCycle: true } },
          },
        });
        if (!servicePackage) throw new Error("The selected service package is no longer available");

        const maxServiceOrder = await tx.proposalService.aggregate({
          where: { proposalId, proposal: { organizationId } },
          _max: { sortOrder: true },
        });
        const section = await tx.proposalService.create({
          data: {
            proposalId,
            serviceId: servicePackage.serviceId,
            serviceName: servicePackage.service.name,
            packageId: servicePackage.id,
            packageName: servicePackage.name,
            hasItems: false,
            description: servicePackage.description,
            sortOrder: (maxServiceOrder._max.sortOrder ?? -1) + 1,
          },
          select: { id: true },
        });
        proposalServiceId = section.id;

        const usdPrice = servicePackage.totalPriceUSD.toNumber();
        unitPrice = isUSD
          ? usdPrice > 0
            ? usdPrice
            : Number((servicePackage.totalPrice.toNumber() / exchangeRate).toFixed(2))
          : servicePackage.totalPrice.toNumber();
        const cycles = new Set(servicePackage.items.map((item) => item.billingCycle));
        billingCycle =
          cycles.size === 1 ? servicePackage.items[0]?.billingCycle ?? "ONE_TIME" : "ONE_TIME";
        name = servicePackage.name;
        description = servicePackage.description;
        unit = "package";
        taxRate = isUSD ? 0 : 18;
        sacCode = servicePackage.sacCode;
        lineItemType = "SERVICE";
      }

      const maxItemOrder = await tx.proposalLineItem.aggregate({
        where: {
          proposalServiceId,
          proposalService: { proposal: { organizationId } },
        },
        _max: { sortOrder: true },
      });
      const financials = calculateItemFinancials(quantity, unitPrice, null, null, taxRate);
      const item = await tx.proposalLineItem.create({
        data: {
          proposalServiceId,
          packageItemId: null,
          productId,
          name,
          description,
          quantity,
          unit,
          unitPrice: new Prisma.Decimal(unitPrice),
          total: new Prisma.Decimal(financials.total),
          billingCycle,
          sortOrder: (maxItemOrder._max.sortOrder ?? -1) + 1,
          isCustom: false,
          taxRate,
          sacCode: sacCode || (lineItemType === "SERVICE" ? "9983" : null),
          itemType: lineItemType,
        },
        select: { id: true },
      });

      await recalculateAndSaveTotals(proposalId, permission.organizationId, tx);
      return item;
    });

    return successResponse("Item added to proposal", { id: result.id });
  } catch (error) {
    if (process.env.NODE_ENV === "development") console.error(error);
    return errorResponse("Failed to add catalog item", getErrorMessage(error));
  }
}

export async function updateProposalLineItem(data: ProposalLineItemEditSchema) {
  try {
    const validated = proposalLineItemEditSchema.safeParse(data);
    if (!validated.success) {
      return errorResponse("Invalid item update data", validated.error.issues);
    }
    const perm = await checkPermission("update", validated.data.proposalId);
    if (!perm.success) return errorResponse(perm.error!);

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
      itemType,
    } = validated.data;
    const draftError = await getProposalDraftError(proposalId);
    if (draftError) return errorResponse(draftError);

    const proposal = await prisma.proposal.findFirst({
      where: { id: proposalId, organizationId: perm.organizationId },
      select: { currency: true },
    });
    const effectiveTaxRate = proposal?.currency === "USD" ? 0 : (taxRate ?? 18);

    const fin = calculateItemFinancials(quantity, unitPrice, discountType, discountValue, effectiveTaxRate);

    await prisma.$transaction(async (tx) => {
      const lineItem = await tx.proposalLineItem.findFirst({
        where: {
          id,
          proposalService: {
            proposalId,
            proposal: { organizationId: perm.organizationId },
          },
        },
        select: {
          id: true,
          name: true,
          description: true,
          productId: true,
          isCustom: true,
          itemType: true,
          proposalService: { select: { hasItems: true } },
        },
      });
      if (!lineItem) throw new Error("The selected proposal line item was not found");
      const effectiveItemType = lineItem.productId
        ? "GOODS"
        : lineItem.isCustom
          ? itemType ?? lineItem.itemType
          : "SERVICE";
      await tx.proposalLineItem.updateMany({
        where: {
          id,
          proposalService: {
            proposalId,
            proposal: { organizationId: perm.organizationId },
          },
        },
        data: {
          name: lineItem.proposalService.hasItems ? name : lineItem.name,
          description: lineItem.proposalService.hasItems
            ? description || null
            : lineItem.description,
          quantity,
          ...(unit ? { unit } : {}),
          unitPrice: new Prisma.Decimal(unitPrice),
          total: new Prisma.Decimal(fin.total),
          billingCycle,
          ...(sortOrder !== undefined ? { sortOrder } : {}),
          discountType: discountType || null,
          discountValue: discountValue !== undefined && discountValue !== null ? new Prisma.Decimal(discountValue) : null,
          taxRate: effectiveTaxRate,
          sacCode: sacCode?.trim() || null,
          itemType: effectiveItemType,
        },
      });

      await recalculateAndSaveTotals(proposalId, perm.organizationId, tx);
    });

    return successResponse("Line item updated successfully");
  } catch (error) {
    if (process.env.NODE_ENV === "development") console.error(error);
    return errorResponse("Failed to update line item", getErrorMessage(error));
  }
}

export async function addCustomLineItem(data: CustomLineItemCreateSchema) {
  try {
    const validated = customLineItemCreateSchema.safeParse(data);
    if (!validated.success) {
      return errorResponse("Invalid line item data", validated.error.issues);
    }
    const perm = await checkPermission("update", validated.data.proposalId);
    if (!perm.success) return errorResponse(perm.error!);

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
      itemType,
    } = validated.data;
    const draftError = await getProposalDraftError(proposalId);
    if (draftError) return errorResponse(draftError);

    const proposal = await prisma.proposal.findFirst({
      where: { id: proposalId, organizationId: perm.organizationId },
      select: { currency: true },
    });
    const effectiveTaxRate = proposal?.currency === "USD" ? 0 : (taxRate ?? 18);

    const fin = calculateItemFinancials(quantity, unitPrice, discountType, discountValue, effectiveTaxRate);

    const newItem = await prisma.$transaction(async (tx) => {
      let targetServiceId: string;
      if (proposalServiceId) {
        const service = await tx.proposalService.findFirst({
          where: {
            id: proposalServiceId,
            proposalId,
            proposal: { organizationId: perm.organizationId },
          },
          select: { id: true, hasItems: true },
        });
        if (!service) throw new Error("The selected proposal section was not found");
        if (!service.hasItems) {
          throw new Error("This package is configured as a single line item; its name and description cannot be edited.");
        }
        targetServiceId = service.id;
      } else {
        const customSection = await tx.proposalService.findFirst({
          where: {
            proposalId,
            proposal: { organizationId: perm.organizationId },
            serviceId: null,
            packageId: null,
            serviceName: { in: ["", "Custom items"] },
          },
          select: { id: true, serviceName: true, description: true },
        });
        if (customSection) {
          targetServiceId = customSection.id;
          if (customSection.serviceName === "Custom items" || customSection.description === "Items added directly to this proposal.") {
            await tx.proposalService.updateMany({
              where: {
                id: customSection.id,
                proposalId,
                proposal: { organizationId: perm.organizationId },
              },
              data: {
                ...(customSection.serviceName === "Custom items" ? { serviceName: "" } : {}),
                ...(customSection.description === "Items added directly to this proposal." ? { description: null } : {}),
              },
            });
          }
        } else {
          const maxServiceOrder = await tx.proposalService.aggregate({
            where: {
              proposalId,
              proposal: { organizationId: perm.organizationId },
            },
            _max: { sortOrder: true },
          });
          const customSection = await tx.proposalService.create({
            data: {
              proposalId,
              serviceName: "",
              sortOrder: (maxServiceOrder._max.sortOrder ?? -1) + 1,
            },
            select: { id: true },
          });
          targetServiceId = customSection.id;
        }
      }

      const maxOrder = await tx.proposalLineItem.aggregate({
        where: {
          proposalServiceId: targetServiceId,
          proposalService: { proposal: { organizationId: perm.organizationId } },
        },
        _max: { sortOrder: true },
      });

      const created = await tx.proposalLineItem.create({
        data: {
          proposalServiceId: targetServiceId,
          packageItemId: null,
          name,
          description: description || null,
          quantity,
          unit,
          unitPrice: new Prisma.Decimal(unitPrice),
          total: new Prisma.Decimal(fin.total),
          billingCycle,
          sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
          isCustom: true,
          discountType: discountType || null,
          discountValue: discountValue !== undefined && discountValue !== null ? new Prisma.Decimal(discountValue) : null,
          taxRate: effectiveTaxRate,
          sacCode: sacCode?.trim() || null,
          itemType,
        },
      });

      await recalculateAndSaveTotals(proposalId, perm.organizationId, tx);
      return created;
    });

    return successResponse("Line item added successfully", { id: newItem.id });
  } catch (error) {
    if (process.env.NODE_ENV === "development") console.error(error);
    return errorResponse("Failed to add line item", getErrorMessage(error));
  }
}

export async function deleteProposalLineItem(itemId: string, proposalId: string) {
  try {
    const perm = await checkPermission("update", proposalId);
    if (!perm.success) return errorResponse(perm.error!);

    const draftError = await getProposalDraftError(proposalId);
    if (draftError) return errorResponse(draftError);

    await prisma.$transaction(async (tx) => {
      const lineItem = await tx.proposalLineItem.findFirst({
        where: {
          id: itemId,
          proposalService: {
            proposalId,
            proposal: { organizationId: perm.organizationId },
          },
        },
        select: { id: true },
      });
      if (!lineItem) throw new Error("The selected proposal line item was not found");
      await tx.proposalLineItem.deleteMany({
        where: {
          id: lineItem.id,
          proposalService: { proposal: { organizationId: perm.organizationId } },
        },
      });

      await recalculateAndSaveTotals(proposalId, perm.organizationId, tx);
    });

    return successResponse("Item deleted successfully");
  } catch (error) {
    if (process.env.NODE_ENV === "development") console.error(error);
    return errorResponse("Failed to delete item", getErrorMessage(error));
  }
}

export async function deleteProposalService(serviceId: string, proposalId: string) {
  try {
    const perm = await checkPermission("update", proposalId);
    if (!perm.success) return errorResponse(perm.error!);

    const draftError = await getProposalDraftError(proposalId);
    if (draftError) return errorResponse(draftError);

    await prisma.$transaction(async (tx) => {
      const service = await tx.proposalService.findFirst({
        where: {
          id: serviceId,
          proposalId,
          proposal: { organizationId: perm.organizationId },
        },
        select: { id: true },
      });
      if (!service) throw new Error("The selected proposal section was not found");
      await tx.proposalService.deleteMany({
        where: {
          id: service.id,
          proposal: { organizationId: perm.organizationId },
        },
      });

      await recalculateAndSaveTotals(proposalId, perm.organizationId, tx);
    });

    try {
      await syncProposalComposerTermsAndFeatures(proposalId, true);
    } catch (e) {
      console.error("Composer auto-sync warning:", e);
    }

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
    const validated = proposalServiceEditSchema.safeParse({
      proposalServiceId: serviceId,
      proposalId,
      ...data,
    });
    if (!validated.success) {
      return errorResponse("Invalid section data", validated.error.issues);
    }
    const perm = await checkPermission("update", proposalId);
    if (!perm.success) return errorResponse(perm.error!);
    const draftError = await getProposalDraftError(validated.data.proposalId);
    if (draftError) return errorResponse(draftError);

    const updated = await prisma.proposalService.updateMany({
      where: {
        id: serviceId,
        proposalId,
        proposal: { organizationId: perm.organizationId },
      },
      data: {
        serviceName: validated.data.serviceName.trim(),
        description: validated.data.description?.trim() ?? null,
      },
    });
    if (updated.count === 0) return errorResponse("Proposal section not found");

    try {
      await syncProposalComposerTermsAndFeatures(proposalId, true);
    } catch (e) {
      console.error("Composer auto-sync warning:", e);
    }

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
    const perm = await checkPermission("update", proposalId);
    if (!perm.success) return errorResponse(perm.error!);

    const draftError = await getProposalDraftError(proposalId);
    if (draftError) return errorResponse(draftError);

    await prisma.$transaction(async (tx) => {
      for (const item of items) {
        const lineItem = await tx.proposalLineItem.findFirst({
          where: {
            id: item.id,
            proposalService: {
              proposalId,
              proposal: { organizationId: perm.organizationId },
            },
          },
          select: { id: true },
        });
        if (!lineItem) throw new Error("The selected proposal line item was not found");
        await tx.proposalLineItem.updateMany({
          where: {
            id: lineItem.id,
            proposalService: { proposal: { organizationId: perm.organizationId } },
          },
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
    const perm = await checkPermission("update", proposalId);
    if (!perm.success) return errorResponse(perm.error!);

    const draftError = await getProposalDraftError(proposalId);
    if (draftError) return errorResponse(draftError);

    await prisma.$transaction(async (tx) => {
      for (const svc of services) {
        const updated = await tx.proposalService.updateMany({
          where: {
            id: svc.id,
            proposalId,
            proposal: { organizationId: perm.organizationId },
          },
          data: { sortOrder: svc.sortOrder },
        });
        if (updated.count === 0) throw new Error("The selected proposal section was not found");
      }
    });

    try {
      await syncProposalComposerTermsAndFeatures(proposalId, true);
    } catch (e) {
      console.error("Composer auto-sync warning:", e);
    }

    return successResponse("Services reordered successfully");
  } catch (error) {
    if (process.env.NODE_ENV === "development") console.error(error);
    return errorResponse("Failed to reorder services", getErrorMessage(error));
  }
}

export async function updateProposalTotals(data: ProposalTotalsUpdateSchema) {
  try {
    const validated = proposalTotalsUpdateSchema.safeParse(data);
    if (!validated.success) {
      return errorResponse("Invalid totals data", validated.error.issues);
    }

    const { proposalId, discount, tax } = validated.data;
    const perm = await checkPermission("update", proposalId);
    if (!perm.success) return errorResponse(perm.error!);
    const draftError = await getProposalDraftError(proposalId);
    if (draftError) return errorResponse(draftError);

    await prisma.$transaction(async (tx) => {
      await tx.proposal.updateMany({
        where: { id: proposalId, organizationId: perm.organizationId },
        data: {
          discount: new Prisma.Decimal(discount),
          tax: new Prisma.Decimal(tax),
        },
      });

      await recalculateAndSaveTotals(proposalId, perm.organizationId, tx);
    });

    return successResponse("Proposal totals updated successfully");
  } catch (error) {
    if (process.env.NODE_ENV === "development") console.error(error);
    return errorResponse("Failed to update proposal totals", getErrorMessage(error));
  }
}
