"use server";

import { Prisma } from "@/app/generated/prisma/client";
import { ActionResponse, errorResponse, successResponse } from "@/lib/action-response";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getErrorMessage } from "@/lib/schemas/prisma-utils";
import {
  CreateInvoiceInput,
  createInvoiceSchema,
  UpdateInvoiceInput,
  updateInvoiceSchema,
  InvoiceQuerySchema,
  invoiceQuerySchema,
  RecordPaymentInput,
  recordPaymentSchema,
} from "@/lib/schemas/invoice-schema";
import { headers } from "next/headers";
import { sendInvoiceLinkEmail } from "@/lib/email";

const InvoiceStatus = {
  DRAFT: "DRAFT",
  SENT: "SENT",
  PARTIALLY_PAID: "PARTIALLY_PAID",
  PAID: "PAID",
  OVERDUE: "OVERDUE",
  VOID: "VOID",
} as const;

export type InvoiceStatus = (typeof InvoiceStatus)[keyof typeof InvoiceStatus];

const PaymentMethod = {
  BANK_TRANSFER: "BANK_TRANSFER",
  UPI: "UPI",
  CREDIT_CARD: "CREDIT_CARD",
  DEBIT_CARD: "DEBIT_CARD",
  CHEQUE: "CHEQUE",
  CASH: "CASH",
  OTHER: "OTHER",
} as const;

export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];

async function getSessionUser() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user) {
    return null;
  }
  return session.user;
}

type InvoicePermissionAction = "create" | "read" | "update" | "delete" | "send" | "record-payment" | "mark-paid";

async function checkInvoicePermission(action: InvoicePermissionAction) {
  try {
    const hasPermission = await auth.api.userHasPermission({
      headers: await headers(),
      body: {
        permissions: {
          invoices: [action],
        },
      },
    });
    return hasPermission.success;
  } catch {
    return false;
  }
}

function formatInvoice<T extends Record<string, any>>(inv: T) {
  if (!inv) return inv;
  const toNumber = (val: any) => {
    if (val === null || val === undefined) return 0;
    if (typeof val === "number") return val;
    if (typeof val === "object" && typeof val.toNumber === "function") return val.toNumber();
    return Number(val) || 0;
  };

  return {
    ...inv,
    subtotal: inv.subtotal !== undefined ? toNumber(inv.subtotal) : inv.subtotal,
    discount: inv.discount !== undefined ? toNumber(inv.discount) : inv.discount,
    tax: inv.tax !== undefined ? toNumber(inv.tax) : inv.tax,
    roundOff: inv.roundOff !== undefined ? toNumber(inv.roundOff) : inv.roundOff,
    grandTotal: inv.grandTotal !== undefined ? toNumber(inv.grandTotal) : inv.grandTotal,
    amountPaid: inv.amountPaid !== undefined ? toNumber(inv.amountPaid) : inv.amountPaid,
    lineItems: Array.isArray(inv.lineItems)
      ? inv.lineItems.map((li: any) => ({
          ...li,
          unitPrice: li.unitPrice !== undefined ? toNumber(li.unitPrice) : li.unitPrice,
          total: li.total !== undefined ? toNumber(li.total) : li.total,
        }))
      : inv.lineItems,
    payments: Array.isArray(inv.payments)
      ? inv.payments.map((p: any) => ({
          ...p,
          amount: p.amount !== undefined ? toNumber(p.amount) : p.amount,
        }))
      : inv.payments,
  };
}


export async function getInvoices(query: InvoiceQuerySchema) {
  try {
    const user = await getSessionUser();
    if (!user) return errorResponse("Unauthorized");

    const canRead = await checkInvoicePermission("read");
    if (!canRead) return errorResponse("You don't have permission to view invoices");

    const validated = invoiceQuerySchema.safeParse(query);
    if (!validated.success) {
      return errorResponse("Invalid query parameters", validated.error.issues);
    }

    const { page, pageSize, search, status, customerId, sortDirection } = validated.data;
    const where: Prisma.InvoiceWhereInput = {
      deletedAt: null,
      ...(status ? { status } : {}),
      ...(customerId ? { customerId } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: "insensitive" } },
              { customerDisplayName: { contains: search, mode: "insensitive" } },
              { customerCompanyName: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    if (!(prisma as any).invoice) {
      return successResponse("Invoices fetched successfully", {
        items: [],
        totalCount: 0,
        page,
        pageSize,
        totalPages: 0,
      });
    }

    const [items, totalCount] = await Promise.all([
      (prisma).invoice.findMany({
        where,
        include: {
          customer: {
            select: {
              id: true,
              displayName: true,
              companyName: true,
              primaryContactEmail: true,
              primaryContactPhone: true,
            },
          },
          createdBy: {
            select: { id: true, name: true, email: true },
          },
          payments: {
            select: { amount: true },
          },
        },
        orderBy: { createdAt: sortDirection },
        skip: page * pageSize,
        take: pageSize,
      }),
      (prisma).invoice.count({ where }),
    ]);

    const formatted = items.map((inv) => formatInvoice(inv));

    return successResponse("Invoices fetched successfully", {
      items: formatted,
      totalCount,
      page,
      pageSize,
      totalPages: Math.ceil(totalCount / pageSize),
    });
  } catch (error) {
    console.error("Failed to fetch invoices:", error);
    return errorResponse("Failed to fetch invoices", getErrorMessage(error));
  }
}

export async function getPublicInvoiceById(id: string) {
  try {
    const invoice = await (prisma).invoice.findFirst({
      where: { id, deletedAt: null },
      include: {
        customer: true,
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        proposal: {
          select: { id: true, proposalNumber: true, title: true },
        },
        bankAccount: true,
        lineItems: {
          include: {
            servicePackage: {
              select: {
                id: true,
                name: true,
                service: {
                  select: { id: true, name: true },
                },
              },
            },
          },
          orderBy: { sortOrder: "asc" },
        },
        payments: {
          orderBy: { createdAt: "desc" },
        },
        activities: {
          include: {
            user: { select: { name: true, email: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!invoice) return errorResponse("Invoice not found");

    const company = await prisma.company.findFirst({
      include: { bankAccounts: true },
    });

    const formatted = {
      ...invoice,
      subtotal: invoice.subtotal.toNumber(),
      discount: invoice.discount.toNumber(),
      tax: invoice.tax.toNumber(),
      roundOff: invoice.roundOff.toNumber(),
      grandTotal: invoice.grandTotal.toNumber(),
      amountPaid: invoice.amountPaid.toNumber(),
      lineItems: invoice.lineItems.map((li) => ({
        ...li,
        unitPrice: li.unitPrice.toNumber(),
        total: li.total.toNumber(),
      })),
      payments: invoice.payments.map((p) => ({
        ...p,
        amount: p.amount.toNumber(),
      })),
      company,
    };

    return successResponse("Invoice retrieved successfully", formatted);
  } catch (error) {
    console.error("Failed to fetch invoice:", error);
    return errorResponse("Failed to fetch invoice", getErrorMessage(error));
  }
}

export async function getInvoiceById(id: string) {
  const user = await getSessionUser();
  if (!user) return errorResponse("Unauthorized");
  const canRead = await checkInvoicePermission("read");
  if (!canRead) return errorResponse("You don't have permission to view invoices");
  return getPublicInvoiceById(id);
}

export async function createInvoice(input: CreateInvoiceInput) {
  try {
    const user = await getSessionUser();
    if (!user) return errorResponse("Unauthorized");

    const canCreate = await checkInvoicePermission("create");
    if (!canCreate) return errorResponse("You don't have permission to create invoices");

    const validated = createInvoiceSchema.safeParse(input);
    if (!validated.success) {
      return errorResponse("Invalid input data", validated.error.issues);
    }

    const customer = await prisma.customer.findUnique({
      where: { id: validated.data.customerId },
    });
    if (!customer) return errorResponse("Selected customer not found");

    let subtotalAcc = 0;
    let taxAcc = 0;

    const lineItemsData = validated.data.lineItems.map((item, index) => {
      const lineSubtotal = item.quantity * item.unitPrice;
      const lineTax = (lineSubtotal * (item.taxRate || 0)) / 100;
      subtotalAcc += lineSubtotal;
      taxAcc += lineTax;

      return {
        servicePackageId: item.servicePackageId || null,
        name: item.name,
        description: item.description || null,
        quantity: item.quantity,
        unit: item.unit || "item",
        unitPrice: new Prisma.Decimal(item.unitPrice),
        taxRate: item.taxRate || 18,
        billingCycle: item.billingCycle || "ONE_TIME",
        total: new Prisma.Decimal(lineSubtotal + lineTax),
        sortOrder: index,
      };
    });

    const discountVal = validated.data.discount || 0;
    const rawTotal = subtotalAcc + taxAcc - discountVal;
    const grandTotal = Math.max(0, Math.round(rawTotal));
    const roundOff = grandTotal - rawTotal;

    const invoice = await (prisma as any).invoice.create({
      data: {
        customerId: customer.id,
        customerDisplayName: customer.displayName,
        customerCompanyName: customer.companyName || null,
        proposalId: validated.data.proposalId || null,
        createdById: user.id,
        title: validated.data.title,
        notes: validated.data.notes || null,
        terms: validated.data.terms || null,
        dueDate: validated.data.dueDate || null,
        bankAccountId: validated.data.bankAccountId || null,
        currency: validated.data.currency || "INR",
        subtotal: new Prisma.Decimal(subtotalAcc),
        discount: new Prisma.Decimal(discountVal),
        tax: new Prisma.Decimal(taxAcc),
        roundOff: new Prisma.Decimal(roundOff),
        grandTotal: new Prisma.Decimal(grandTotal),
        amountPaid: new Prisma.Decimal(0),
        status: InvoiceStatus.DRAFT,
        lineItems: {
          create: lineItemsData,
        },
        activities: {
          create: {
            userId: user.id,
            action: "CREATED",
            details: "Invoice draft created",
          },
        },
      },
    });

    return successResponse("Invoice created successfully", formatInvoice(invoice));
  } catch (error) {
    console.error("Failed to create invoice:", error);
    return errorResponse("Failed to create invoice", getErrorMessage(error));
  }
}

export async function updateInvoice(input: UpdateInvoiceInput) {
  try {
    const user = await getSessionUser();
    if (!user) return errorResponse("Unauthorized");

    const canUpdate = await checkInvoicePermission("update");
    if (!canUpdate) return errorResponse("You don't have permission to update invoices");

    const validated = updateInvoiceSchema.safeParse(input);
    if (!validated.success) {
      return errorResponse("Invalid input data", validated.error.issues);
    }

    const { id, customerId, title, notes, terms, dueDate, bankAccountId, currency, discount, lineItems, status } = validated.data;

    const existing = await (prisma as any).invoice.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) return errorResponse("Invoice not found");

    if (existing.status === InvoiceStatus.PAID) {
      return errorResponse("Paid invoices are immutable and cannot be edited.");
    }

    let customerDisplayName = existing.customerDisplayName;
    let customerCompanyName = existing.customerCompanyName;

    if (customerId && customerId !== existing.customerId) {
      const customer = await prisma.customer.findUnique({
        where: { id: customerId },
      });
      if (!customer) return errorResponse("Selected customer not found");
      customerDisplayName = customer.displayName;
      customerCompanyName = customer.companyName || null;
    }

    let subtotalAcc = 0;
    let taxAcc = 0;

    let lineItemsData: any[] = [];
    if (lineItems) {
      lineItemsData = lineItems.map((item, index) => {
        const lineSubtotal = item.quantity * item.unitPrice;
        const lineTax = (lineSubtotal * (item.taxRate || 0)) / 100;
        subtotalAcc += lineSubtotal;
        taxAcc += lineTax;

        return {
          servicePackageId: item.servicePackageId || null,
          name: item.name,
          description: item.description || null,
          quantity: item.quantity,
          unit: item.unit || "item",
          unitPrice: new Prisma.Decimal(item.unitPrice),
          taxRate: item.taxRate || 18,
          billingCycle: item.billingCycle || "ONE_TIME",
          total: new Prisma.Decimal(lineSubtotal + lineTax),
          sortOrder: index,
        };
      });
    }

    const discountVal = discount !== undefined ? discount : existing.discount.toNumber();
    const rawTotal = subtotalAcc + taxAcc - discountVal;
    const grandTotal = Math.max(0, Math.round(rawTotal));
    const roundOff = grandTotal - rawTotal;

    const updatedInvoice = await prisma.$transaction(async (tx: any) => {
      if (lineItems) {
        await tx.invoiceLineItem.deleteMany({
          where: { invoiceId: id },
        });
      }

      return tx.invoice.update({
        where: { id },
        data: {
          ...(customerId ? { customerId, customerDisplayName, customerCompanyName } : {}),
          ...(title ? { title } : {}),
          ...(notes !== undefined ? { notes } : {}),
          ...(terms !== undefined ? { terms } : {}),
          ...(dueDate !== undefined ? { dueDate } : {}),
          ...(bankAccountId !== undefined ? { bankAccountId } : {}),
          ...(currency ? { currency } : {}),
          ...(discount !== undefined ? { discount: new Prisma.Decimal(discountVal) } : {}),
          ...(status ? { status } : {}),
          subtotal: new Prisma.Decimal(subtotalAcc),
          tax: new Prisma.Decimal(taxAcc),
          roundOff: new Prisma.Decimal(roundOff),
          grandTotal: new Prisma.Decimal(grandTotal),
          ...(lineItemsData.length > 0
            ? {
                lineItems: {
                  create: lineItemsData,
                },
              }
            : {}),
          activities: {
            create: {
              userId: user.id,
              action: "UPDATED",
              details: "Invoice updated",
            },
          },
        },
      });
    });

    return successResponse("Invoice updated successfully", formatInvoice(updatedInvoice));
  } catch (error) {
    console.error("Failed to update invoice:", error);
    return errorResponse("Failed to update invoice", getErrorMessage(error));
  }
}

export async function updateInvoiceStatus(id: string, status: InvoiceStatus) {
  try {
    const user = await getSessionUser();
    if (!user) return errorResponse("Unauthorized");

    const permAction = status === InvoiceStatus.SENT ? "send" : status === InvoiceStatus.PAID || status === InvoiceStatus.VOID ? "mark-paid" : "update";
    const canUpdate = await checkInvoicePermission(permAction);
    if (!canUpdate) return errorResponse("You don't have permission to update invoice status");

    const existing = await (prisma as any).invoice.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) return errorResponse("Invoice not found");

    if (existing.status === InvoiceStatus.PAID && status !== InvoiceStatus.PAID) {
      return errorResponse("Paid invoices are immutable and cannot change status.");
    }

    const updated = await (prisma as any).invoice.update({
      where: { id },
      data: {
        status,
        activities: {
          create: {
            userId: user.id,
            action: status === InvoiceStatus.SENT ? "SENT" : status === InvoiceStatus.VOID ? "VOIDED" : "UPDATED",
            details: `Invoice status changed to ${status}`,
          },
        },
      },
    });

    return successResponse(`Invoice status updated to ${status}`, formatInvoice(updated));
  } catch (error) {
    console.error("Failed to update status:", error);
    return errorResponse("Failed to update status", getErrorMessage(error));
  }
}

export async function recordInvoicePayment(input: RecordPaymentInput) {
  try {
    const user = await getSessionUser();
    if (!user) return errorResponse("Unauthorized");

    const canRecord = await checkInvoicePermission("record-payment");
    if (!canRecord) return errorResponse("You don't have permission to record invoice payments");

    const validated = recordPaymentSchema.safeParse(input);
    if (!validated.success) {
      return errorResponse("Invalid payment data", validated.error.issues);
    }

    const invoice = await (prisma as any).invoice.findFirst({
      where: { id: validated.data.invoiceId, deletedAt: null },
    });
    if (!invoice) return errorResponse("Invoice not found");

    const newAmountPaid = invoice.amountPaid.toNumber() + validated.data.amount;
    const grandTotal = invoice.grandTotal.toNumber();

    let newStatus: InvoiceStatus = invoice.status;
    if (newAmountPaid >= grandTotal) {
      newStatus = InvoiceStatus.PAID;
    } else if (newAmountPaid > 0) {
      newStatus = InvoiceStatus.PARTIALLY_PAID;
    }

    const [payment] = await prisma.$transaction([
      prisma.invoicePayment.create({
        data: {
          invoiceId: invoice.id,
          amount: new Prisma.Decimal(validated.data.amount),
          paymentMethod: validated.data.paymentMethod as PaymentMethod,
          paymentDate: validated.data.paymentDate,
          referenceId: validated.data.referenceId || null,
          notes: validated.data.notes || null,
        },
      }),
      (prisma as any).invoice.update({
        where: { id: invoice.id },
        data: {
          amountPaid: new Prisma.Decimal(newAmountPaid),
          status: newStatus,
          activities: {
            create: {
              userId: user.id,
              action: newStatus === InvoiceStatus.PAID ? "MARKED_PAID" : "PAYMENT_RECEIVED",
              details: `Payment of ${invoice.currency} ${validated.data.amount} recorded via ${validated.data.paymentMethod}`,
            },
          },
        },
      }),
    ]);

    const formattedPayment = {
      ...payment,
      amount: payment.amount && typeof (payment.amount as any).toNumber === "function" ? (payment.amount as any).toNumber() : Number(payment.amount),
    };
    return successResponse("Payment recorded successfully", formattedPayment);
  } catch (error) {
    console.error("Failed to record payment:", error);
    return errorResponse("Failed to record payment", getErrorMessage(error));
  }
}

export async function searchServicePackages(searchQuery: string) {
  try {
    const user = await getSessionUser();
    if (!user) return errorResponse("Unauthorized");

    const packages = await prisma.servicePackage.findMany({
      where: {
        isActive: true,
        OR: [
          { name: { contains: searchQuery, mode: "insensitive" } },
          { service: { name: { contains: searchQuery, mode: "insensitive" } } },
        ],
      },
      include: {
        service: { select: { id: true, name: true } },
        items: true,
      },
      take: 20,
    });

    const formatted = packages.map((pkg) => ({
      id: pkg.id,
      name: pkg.name,
      serviceName: pkg.service.name,
      description: pkg.description,
      totalPrice: pkg.totalPrice.toNumber(),
      totalPriceUSD: pkg.totalPriceUSD ? pkg.totalPriceUSD.toNumber() : 0,
      items: pkg.items.map((it) => ({
        id: it.id,
        name: it.name,
        description: it.description,
        quantity: it.quantity,
        unitPrice: it.unitPrice.toNumber(),
        unitPriceUSD: it.unitPriceUSD ? it.unitPriceUSD.toNumber() : 0,
        unit: it.unit,
        billingCycle: it.billingCycle,
      })),
    }));

    return successResponse("Packages retrieved successfully", formatted);
  } catch (error) {
    console.error("Failed to search packages:", error);
    return errorResponse("Failed to search service packages", getErrorMessage(error));
  }
}

export async function softDeleteInvoice(id: string) {
  try {
    const user = await getSessionUser();
    if (!user) return errorResponse("Unauthorized");

    const canDelete = await checkInvoicePermission("delete");
    if (!canDelete) return errorResponse("You don't have permission to delete invoices");

    const invoice = await (prisma as any).invoice.findFirst({
      where: { id, deletedAt: null },
    });
    if (!invoice) return errorResponse("Invoice not found");

    if (invoice.status === InvoiceStatus.PAID) {
      return errorResponse("Paid invoices cannot be deleted.");
    }

    await (prisma as any).invoice.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return successResponse("Invoice deleted successfully");
  } catch (error) {
    console.error("Failed to delete invoice:", error);
    return errorResponse("Failed to delete invoice", getErrorMessage(error));
  }
}

export async function getCompanyBankAccounts() {
  try {
    const user = await getSessionUser();
    if (!user) return errorResponse("Unauthorized");

    const accounts = await prisma.companyBankAccount.findMany({
      where: { isActive: true },
      orderBy: [{ isDefault: "desc" }, { displayOrder: "asc" }],
    });

    const formatted = accounts.map((acc) => ({
      id: acc.id,
      accountName: acc.accountName,
      bankName: acc.bankName,
      isDefault: acc.isDefault,
    }));

    return successResponse("Bank accounts retrieved successfully", formatted);
  } catch (error) {
    console.error("Failed to fetch bank accounts:", error);
    return errorResponse("Failed to fetch bank accounts", getErrorMessage(error));
  }
}

export async function createInvoiceFromProposal(proposalId: string) {
  try {
    const user = await getSessionUser();
    if (!user) return errorResponse("Unauthorized");

    const canCreate = await checkInvoicePermission("create");
    if (!canCreate) return errorResponse("You don't have permission to create invoices");

    const existingInvoice = await (prisma as any).invoice.findFirst({
      where: { proposalId, deletedAt: null },
    });
    if (existingInvoice) {
      return successResponse("Invoice already exists for this proposal", formatInvoice(existingInvoice));
    }

    const proposal = await prisma.proposal.findUnique({
      where: { id: proposalId },
      include: {
        customer: true,
        proposalServices: {
          include: {
            items: { orderBy: { sortOrder: "asc" } },
          },
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    if (!proposal) return errorResponse("Proposal not found");

    const lineItemsData: any[] = [];
    let sortOrder = 0;

    for (const service of proposal.proposalServices) {
      for (const item of service.items) {
        lineItemsData.push({
          servicePackageId: service.packageId || null,
          name: item.name,
          description: item.description || service.description || null,
          quantity: item.quantity,
          unit: item.unit || "item",
          unitPrice: item.unitPrice,
          taxRate: item.taxRate || 18,
          billingCycle: item.billingCycle || "ONE_TIME",
          total: item.total,
          sortOrder: sortOrder++,
        });
      }
    }

    const invoice = await (prisma as any).invoice.create({
      data: {
        customerId: proposal.customerId,
        customerDisplayName: proposal.customerDisplayName,
        customerCompanyName: proposal.customerCompanyName || null,
        proposalId: proposal.id,
        createdById: user.id,
        title: `Invoice for ${proposal.title}`,
        notes: proposal.notes || null,
        bankAccountId: proposal.bankAccountId || null,
        currency: proposal.currency || "INR",
        subtotal: proposal.subtotal,
        discount: proposal.discount,
        tax: proposal.tax,
        roundOff: proposal.roundOff,
        grandTotal: proposal.grandTotal,
        amountPaid: new Prisma.Decimal(0),
        status: InvoiceStatus.DRAFT,
        lineItems: {
          create: lineItemsData,
        },
        activities: {
          create: {
            userId: user.id,
            action: "CREATED",
            details: `Invoice generated from Proposal #${proposal.proposalNumber}`,
          },
        },
      },
    });

    return successResponse("Invoice generated successfully from proposal", formatInvoice(invoice));
  } catch (error) {
    console.error("Failed to generate invoice from proposal:", error);
    return errorResponse("Failed to generate invoice from proposal", getErrorMessage(error));
  }
}

export async function sendInvoiceEmailAction(invoiceId: string, email: string, invoiceUrl: string) {
  try {
    const user = await getSessionUser();
    if (!user) return errorResponse("Unauthorized");

    const canSend = await checkInvoicePermission("send");
    if (!canSend) return errorResponse("You don't have permission to send invoice emails");

    const invoice = await (prisma as any).invoice.findFirst({
      where: { id: invoiceId, deletedAt: null },
    });
    if (!invoice) return errorResponse("Invoice not found");

    const company = await prisma.company.findFirst();
    const companyName = company?.displayName || company?.legalName || "Our Company";
    const invNum = String(invoice.invoiceNumber).padStart(4, "0");

    await sendInvoiceLinkEmail({
      email,
      appName: companyName,
      invoiceUrl,
      invoiceNumber: invNum,
      companyName,
    });

    if (invoice.status === InvoiceStatus.DRAFT) {
      await updateInvoiceStatus(invoiceId, InvoiceStatus.SENT as any);
    }

    return successResponse("Invoice email sent successfully");
  } catch (error) {
    console.error("Failed to send invoice email:", error);
    return errorResponse("Failed to send invoice email", getErrorMessage(error));
  }
}
