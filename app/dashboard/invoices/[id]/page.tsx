export const metadata = {
  title: "Invoice Details",
};

import DashboardContainer from "@/app/dashboard/dashboard-container";
import { InvoiceDetailView } from "@/components/invoice/invoice-detail-view";
import { requirePageAccess } from "@/lib/auth-guard";

export default async function InvoiceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ action?: string | string[] }>;
}) {
  await requirePageAccess("/dashboard/invoices");
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const openPaymentOnLoad = query.action === "record-payment";

  return (
    <DashboardContainer title="Invoice Details">
      <InvoiceDetailView invoiceId={id} openPaymentOnLoad={openPaymentOnLoad} />
    </DashboardContainer>
  );
}
