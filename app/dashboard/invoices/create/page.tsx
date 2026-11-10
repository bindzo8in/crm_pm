export const metadata = {
  title: "Create Invoice",
};

import DashboardContainer from "@/app/dashboard/dashboard-container";
import { CreateInvoiceForm } from "@/components/invoice/create-invoice-form";
import { requirePageAccess } from "@/lib/auth-guard";
import { formatInIST } from "@/lib/date";

export default async function CreateInvoicePage() {
  await requirePageAccess("/dashboard/invoices");

  return (
    <DashboardContainer title="Create Invoice" hideHeaderOnMobile>
      <CreateInvoiceForm today={formatInIST(new Date(), "yyyy-MM-dd")} />
    </DashboardContainer>
  );
}
