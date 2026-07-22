export const metadata = {
  title: "Edit Invoice",
};

import { getInvoiceById } from "@/actions/invoice";
import DashboardContainer from "@/app/dashboard/dashboard-container";
import { CreateInvoiceForm } from "@/components/invoice/create-invoice-form";
import { requirePageAccess } from "@/lib/auth-guard";
import { notFound } from "next/navigation";

interface EditInvoicePageProps {
  params: Promise<{ id: string }>;
}

export default async function EditInvoicePage({ params }: EditInvoicePageProps) {
  await requirePageAccess("/dashboard/invoices");

  const { id } = await params;
  const res = await getInvoiceById(id);

  if (!res.success || !res.data) {
    notFound();
  }

  const invoice = res.data;

  return (
    <DashboardContainer title={`Edit Invoice - INV-${String(invoice.invoiceNumber).padStart(4, "0")}`}>
      <CreateInvoiceForm initialData={invoice} />
    </DashboardContainer>
  );
}
