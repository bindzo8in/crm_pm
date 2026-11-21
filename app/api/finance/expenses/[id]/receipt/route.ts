import { auth } from "@/lib/auth";
import { checkOrganizationPermission, getActiveOrganizationId } from "@/lib/organization-authorization";
import { createAttachmentContentDisposition } from "@/lib/chat-attachment";
import { parseExpenseReceiptUrl } from "@/lib/expense-receipt";
import prisma from "@/lib/prisma";
import { z } from "zod";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    return Response.json({ message: "Sign in to view this receipt." }, { status: 401 });
  }

  const organizationId = await getActiveOrganizationId(request.headers);
  const permission = await checkOrganizationPermission({
    headers: request.headers,
    body: { permissions: { finance: ["read"] } },
  });
  if (!organizationId || !permission.success) {
    return Response.json({ message: "You cannot access this receipt." }, { status: 403 });
  }

  const { id } = await params;
  const parsedId = z.string().trim().min(1).max(128).safeParse(id);
  if (!parsedId.success) {
    return Response.json({ message: "Expense ID is invalid." }, { status: 400 });
  }

  const company = await prisma.company.findUnique({
    where: { organizationId },
    select: { id: true },
  });
  if (!company) {
    return Response.json({ message: "Expense not found." }, { status: 404 });
  }

  const expense = await prisma.expense.findFirst({
    where: {
      id: parsedId.data,
      deletedAt: null,
      financialAccount: { companyId: company.id },
    },
    select: { receiptUrl: true, transactionNumber: true },
  });
  if (!expense?.receiptUrl) {
    return Response.json({ message: "Receipt not found." }, { status: 404 });
  }

  const receipt = parseExpenseReceiptUrl(expense.receiptUrl);
  if (!receipt) {
    console.error("Expense receipt has an invalid Cloudinary URL", { expenseId: id });
    return Response.json({ message: "Receipt storage location is invalid." }, { status: 502 });
  }

  try {
    const upstream = await fetch(receipt.url, { cache: "no-store", redirect: "error" });
    if (!upstream.ok || !upstream.body) {
      console.error("Expense receipt download failed", {
        expenseId: id,
        status: upstream.status,
      });
      return Response.json({ message: "Unable to retrieve this receipt." }, { status: 502 });
    }

    const disposition = new URL(request.url).searchParams.get("download") === "1"
      ? "attachment"
      : "inline";
    const headers = new Headers({
      "Content-Type": receipt.contentType,
      "Content-Disposition": createAttachmentContentDisposition(
        `receipt-${expense.transactionNumber}.${receipt.extension}`,
        disposition,
      ),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    });
    const contentLength = upstream.headers.get("content-length");
    if (contentLength) headers.set("Content-Length", contentLength);

    return new Response(upstream.body, { status: 200, headers });
  } catch (error) {
    console.error("Failed to retrieve expense receipt", { expenseId: id, error });
    return Response.json({ message: "Unable to retrieve this receipt." }, { status: 502 });
  }
}
