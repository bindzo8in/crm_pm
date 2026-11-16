export const metadata = {
  title: "Create Invoice",
};

import DashboardContainer from "@/app/dashboard/dashboard-container";
import { CreateInvoiceForm } from "@/components/invoice/create-invoice-form";
import { requirePageAccess } from "@/lib/auth-guard";
import { formatInIST } from "@/lib/date";
import { getActiveOrganizationId } from "@/lib/organization-authorization";
import { getOrganizationMemberOptions } from "@/repositories/organization-member-repository";

export default async function CreateInvoicePage() {
  await requirePageAccess("/dashboard/invoices");
  const organizationId = await getActiveOrganizationId();
  const assignees = organizationId
    ? await getOrganizationMemberOptions(organizationId)
    : [];

  return (
    <DashboardContainer title="Create Invoice" hideHeaderOnMobile>
      <CreateInvoiceForm today={formatInIST(new Date(), "yyyy-MM-dd")} assignees={assignees} />
    </DashboardContainer>
  );
}
