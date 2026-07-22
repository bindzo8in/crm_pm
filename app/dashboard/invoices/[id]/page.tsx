export const metadata = {
  title: "Invoice Details",
};

import DashboardContainer from "@/app/dashboard/dashboard-container";
import { InvoiceDetailView } from "@/components/invoice/invoice-detail-view";
import { requirePageAccess } from "@/lib/auth-guard";

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePageAccess("/dashboard/invoices");
  const { id } = await params;

  return (
    <DashboardContainer title="Invoice Details">
      <InvoiceDetailView invoiceId={id} />
    </DashboardContainer>
  );
}
