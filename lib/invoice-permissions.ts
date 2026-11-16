import type { InvoiceWhereInput } from "@/app/generated/prisma/models";
import { auth } from "@/lib/auth";
import {
  checkOrganizationPermission,
  getActiveOrganizationId,
} from "@/lib/organization-authorization";
import prisma from "@/lib/prisma";
import { headers } from "next/headers";

type InvoicePermission =
  | "read"
  | "update"
  | "delete"
  | "send"
  | "record-payment"
  | "mark-paid";

type InvoiceOwnPermission =
  | "read-own"
  | "update-own"
  | "delete-own"
  | "send-own"
  | "record-payment-own"
  | "mark-paid-own";

export async function getInvoicePermissionScope(
  permission: InvoicePermission,
  ownPermission: InvoiceOwnPermission,
  invoiceId?: string,
): Promise<{ userId: string; where: InvoiceWhereInput } | null> {
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session?.user) return null;
  const organizationId = await getActiveOrganizationId(requestHeaders);
  if (!organizationId) return null;

  const [allAccess, ownAccess] = await Promise.all([
    checkOrganizationPermission({
      headers: requestHeaders,
      body: { permissions: { invoices: [permission] } },
    }),
    checkOrganizationPermission({
      headers: requestHeaders,
      body: { permissions: { invoices: [ownPermission] } },
    }),
  ]);

  if (allAccess.success) {
    return {
      userId: session.user.id,
      where: {
        organizationId,
        ...(invoiceId ? { id: invoiceId } : {}),
      },
    };
  }
  if (!ownAccess.success) return null;

  const ownerFilter: InvoiceWhereInput = {
    organizationId,
    OR: [
      { createdById: session.user.id },
      { assignedToId: session.user.id },
    ],
  };
  if (invoiceId) {
    const accessibleInvoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, ...ownerFilter, deletedAt: null },
      select: { id: true },
    });
    if (!accessibleInvoice) return null;
  }

  return {
    userId: session.user.id,
    where: invoiceId ? { id: invoiceId, ...ownerFilter } : ownerFilter,
  };
}
