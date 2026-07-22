export const metadata = {
  title: "Create Invoice",
};

import DashboardContainer from "@/app/dashboard/dashboard-container";
import { CreateInvoiceForm } from "@/components/invoice/create-invoice-form";
import { requirePageAccess } from "@/lib/auth-guard";

export default async function CreateInvoicePage() {
  await requirePageAccess("/dashboard/invoices");

  return (
    <DashboardContainer title="Create Invoice">
      <CreateInvoiceForm />
    </DashboardContainer>
  );
}
