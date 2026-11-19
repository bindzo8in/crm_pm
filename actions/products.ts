"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { Prisma } from "@/app/generated/prisma/client";
import { checkOrganizationPermission, getActiveOrganizationId } from "@/lib/organization-authorization";
import { errorResponse, successResponse } from "@/lib/action-response";
import { getErrorMessage } from "@/lib/schemas/prisma-utils";
import prisma from "@/lib/prisma";
import {
  productActiveSchema,
  productQuerySchema,
  productSchema,
  type ProductQuerySchema,
  type ProductSchema,
} from "@/lib/schemas/product-schema";

export type BillableCatalogItem =
  | {
      kind: "product";
      id: string;
      name: string;
      description: string | null;
      unit: string;
      basePrice: number;
      basePriceUSD: number;
      taxRate: number;
      hsnCode: string | null;
      billingCycle: "ONE_TIME";
    }
  | {
      kind: "service-package";
      id: string;
      name: string;
      serviceName: string;
      description: string | null;
      unit: "package";
      basePrice: number;
      basePriceUSD: number;
      taxRate: 18;
      hsnCode: string | null;
      billingCycle: "ONE_TIME" | "MONTHLY" | "QUARTERLY" | "HALF_YEARLY" | "YEARLY";
    };

async function checkProductPermission(permission: "read" | "create" | "update") {
  return checkOrganizationPermission({
    headers: await headers(),
    body: { permissions: { products: [permission] } },
  });
}

async function getBillableCatalogPermissions() {
  const requestHeaders = await headers();
  const [products, services] = await Promise.all([
    checkOrganizationPermission({
      headers: requestHeaders,
      body: { permissions: { products: ["read"] } },
    }),
    checkOrganizationPermission({
      headers: requestHeaders,
      body: { permissions: { services: ["read"] } },
    }),
  ]);
  return {
    products: products.success,
    services: services.success,
  };
}

export async function getProducts(query: ProductQuerySchema) {
  try {
    const permission = await checkProductPermission("read");
    if (!permission.success) return errorResponse("You don't have permission to view products");

    const organizationId = await getActiveOrganizationId();
    if (!organizationId) return errorResponse("Choose an organization to view products");

    const validated = productQuerySchema.safeParse(query);
    if (!validated.success) return errorResponse("Invalid product search", validated.error.issues);

    const { page, pageSize, search, isActive, sortDirection } = validated.data;
    const where: Prisma.ProductWhereInput = {
      organizationId,
      deletedAt: null,
      ...(isActive !== undefined ? { isActive } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { sku: { contains: search, mode: "insensitive" } },
              { description: { contains: search, mode: "insensitive" } },
              { hsnCode: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [products, total] = await prisma.$transaction([
      prisma.product.findMany({
        where,
        skip: page * pageSize,
        take: pageSize,
        orderBy: [{ name: sortDirection }, { id: "asc" }],
        select: {
          id: true,
          sku: true,
          name: true,
          description: true,
          unit: true,
          basePrice: true,
          basePriceUSD: true,
          taxRate: true,
          hsnCode: true,
          isActive: true,
          updatedAt: true,
        },
      }),
      prisma.product.count({ where }),
    ]);

    return successResponse("Products found", {
      data: products.map((product) => ({
        ...product,
        basePrice: product.basePrice.toNumber(),
        basePriceUSD: product.basePriceUSD.toNumber(),
      })),
      pagination: {
        page,
        pageSize,
        total,
        pageCount: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    return errorResponse("Failed to load products", getErrorMessage(error));
  }
}

export async function getProduct(id: string) {
  try {
    const permission = await checkProductPermission("read");
    if (!permission.success) return errorResponse("You don't have permission to view products");

    const organizationId = await getActiveOrganizationId();
    if (!organizationId) return errorResponse("Choose an organization to view products");

    const product = await prisma.product.findFirst({
      where: { id, organizationId, deletedAt: null },
      select: {
        id: true,
        sku: true,
        name: true,
        description: true,
        unit: true,
        basePrice: true,
        basePriceUSD: true,
        taxRate: true,
        hsnCode: true,
        isActive: true,
      },
    });
    if (!product) return errorResponse("Product not found");

    return successResponse("Product found", {
      ...product,
      basePrice: product.basePrice.toNumber(),
      basePriceUSD: product.basePriceUSD.toNumber(),
    });
  } catch (error) {
    return errorResponse("Failed to load product", getErrorMessage(error));
  }
}

async function ensureSkuAvailable(
  organizationId: string,
  sku: string | null | undefined,
  excludeId?: string,
) {
  if (!sku) return true;
  const duplicate = await prisma.product.findFirst({
    where: {
      organizationId,
      sku,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true },
  });
  return !duplicate;
}

export async function createProduct(data: ProductSchema) {
  try {
    const permission = await checkProductPermission("create");
    if (!permission.success) return errorResponse("You don't have permission to create products");

    const organizationId = await getActiveOrganizationId();
    if (!organizationId) return errorResponse("Choose an organization before creating a product");

    const validated = productSchema.safeParse(data);
    if (!validated.success) return errorResponse("Invalid product data", validated.error.issues);
    const values = validated.data;
    const sku = values.sku?.trim() || null;
    if (!(await ensureSkuAvailable(organizationId, sku))) {
      return errorResponse("A product with this SKU already exists");
    }

    const product = await prisma.product.create({
      data: {
        organizationId,
        sku,
        name: values.name,
        description: values.description?.trim() || null,
        unit: values.unit,
        basePrice: new Prisma.Decimal(values.basePrice),
        basePriceUSD: new Prisma.Decimal(values.basePriceUSD),
        taxRate: values.taxRate,
        hsnCode: values.hsnCode?.trim() || null,
        isActive: values.isActive,
      },
      select: { id: true },
    });
    revalidatePath("/dashboard/products");
    return successResponse("Product created successfully", { id: product.id });
  } catch (error) {
    return errorResponse("Failed to create product", getErrorMessage(error));
  }
}

export async function updateProduct(data: ProductSchema) {
  try {
    const permission = await checkProductPermission("update");
    if (!permission.success) return errorResponse("You don't have permission to update products");

    const organizationId = await getActiveOrganizationId();
    if (!organizationId) return errorResponse("Choose an organization before updating a product");

    const validated = productSchema.safeParse(data);
    if (!validated.success || !validated.data.id) {
      return errorResponse(
        "Invalid product data",
        validated.success ? undefined : validated.error.issues,
      );
    }
    const values = validated.data;
    const existing = await prisma.product.findFirst({
      where: { id: values.id, organizationId, deletedAt: null },
      select: { id: true },
    });
    if (!existing) return errorResponse("Product not found");

    const sku = values.sku?.trim() || null;
    if (!(await ensureSkuAvailable(organizationId, sku, values.id))) {
      return errorResponse("A product with this SKU already exists");
    }

    await prisma.product.update({
      where: { id: values.id },
      data: {
        sku,
        name: values.name,
        description: values.description?.trim() || null,
        unit: values.unit,
        basePrice: new Prisma.Decimal(values.basePrice),
        basePriceUSD: new Prisma.Decimal(values.basePriceUSD),
        taxRate: values.taxRate,
        hsnCode: values.hsnCode?.trim() || null,
        isActive: values.isActive,
      },
    });
    revalidatePath("/dashboard/products");
    return successResponse("Product updated successfully");
  } catch (error) {
    return errorResponse("Failed to update product", getErrorMessage(error));
  }
}

export async function setProductActive(id: string, isActive: boolean) {
  try {
    const permission = await checkProductPermission("update");
    if (!permission.success) return errorResponse("You don't have permission to update products");

    const organizationId = await getActiveOrganizationId();
    if (!organizationId) return errorResponse("Choose an organization before updating a product");

    const validated = productActiveSchema.safeParse({ id, isActive });
    if (!validated.success) return errorResponse("Invalid product status", validated.error.issues);
    const result = await prisma.product.updateMany({
      where: { id: validated.data.id, organizationId, deletedAt: null },
      data: { isActive: validated.data.isActive },
    });
    if (result.count === 0) return errorResponse("Product not found");

    revalidatePath("/dashboard/products");
    return successResponse(validated.data.isActive ? "Product activated" : "Product deactivated");
  } catch (error) {
    return errorResponse("Failed to update product status", getErrorMessage(error));
  }
}

export async function searchBillableItems(searchQuery: string) {
  try {
    const permissions = await getBillableCatalogPermissions();
    if (!permissions.products && !permissions.services) {
      return errorResponse("You don't have permission to search the item catalog");
    }

    const organizationId = await getActiveOrganizationId();
    if (!organizationId) return errorResponse("Choose an organization to search the item catalog");

    const validatedSearch = productQuerySchema.shape.search.safeParse(searchQuery);
    if (!validatedSearch.success) return errorResponse("Invalid catalog search", validatedSearch.error.issues);
    const search = validatedSearch.data?.trim() ?? "";

    const [products, packages] = await Promise.all([
      permissions.products
        ? prisma.product.findMany({
        where: {
          organizationId,
          isActive: true,
          deletedAt: null,
          ...(search
            ? {
                OR: [
                  { name: { contains: search, mode: "insensitive" } },
                  { sku: { contains: search, mode: "insensitive" } },
                  { description: { contains: search, mode: "insensitive" } },
                ],
              }
            : {}),
        },
        take: 10,
        orderBy: [{ name: "asc" }, { id: "asc" }],
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
      })
        : Promise.resolve([]),
      permissions.services
        ? prisma.servicePackage.findMany({
        where: {
          isActive: true,
          service: { organizationId, isActive: true, deletedAt: null },
          ...(search
            ? {
                OR: [
                  { name: { contains: search, mode: "insensitive" } },
                  { description: { contains: search, mode: "insensitive" } },
                  { service: { name: { contains: search, mode: "insensitive" } } },
                  { items: { some: { name: { contains: search, mode: "insensitive" } } } },
                ],
              }
            : {}),
        },
        take: 10,
        orderBy: [{ name: "asc" }, { id: "asc" }],
        select: {
          id: true,
          name: true,
          description: true,
          totalPrice: true,
          totalPriceUSD: true,
          sacCode: true,
          service: { select: { name: true } },
          items: { select: { billingCycle: true } },
        },
      })
        : Promise.resolve([]),
    ]);

    const productItems: BillableCatalogItem[] = products.map((product) => ({
      kind: "product",
      id: product.id,
      name: product.name,
      description: product.description,
      unit: product.unit,
      basePrice: product.basePrice.toNumber(),
      basePriceUSD: product.basePriceUSD.toNumber(),
      taxRate: product.taxRate,
      hsnCode: product.hsnCode,
      billingCycle: "ONE_TIME",
    }));

    const packageItems: BillableCatalogItem[] = packages.map((servicePackage) => {
      const cycles = new Set(servicePackage.items.map((item) => item.billingCycle));
      const billingCycle =
        cycles.size === 1 ? servicePackage.items[0]?.billingCycle ?? "ONE_TIME" : "ONE_TIME";
      return {
        kind: "service-package",
        id: servicePackage.id,
        name: servicePackage.name,
        serviceName: servicePackage.service.name,
        description: servicePackage.description,
        unit: "package",
        basePrice: servicePackage.totalPrice.toNumber(),
        basePriceUSD: servicePackage.totalPriceUSD.toNumber(),
        taxRate: 18,
        hsnCode: servicePackage.sacCode,
        billingCycle,
      };
    });

    const items = [...productItems, ...packageItems].sort(
      (left, right) => left.name.localeCompare(right.name) || left.kind.localeCompare(right.kind),
    );
    return successResponse("Catalog items found", items);
  } catch (error) {
    return errorResponse("Failed to search the item catalog", getErrorMessage(error));
  }
}
