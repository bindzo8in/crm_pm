export const metadata = {
  title: "Create Proposals"
};

import { ProposalCreateEditForm } from "@/components/proposal/form";
import DashboardContainer from "../../dashboard-container";
import { getQueryClient } from "@/lib/query-client";
import { customerKeys } from "@/components/customers/customer-query-key";
import { GetCustomerOptions } from "@/actions/customer";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { requirePageAccess } from "@/lib/auth-guard";
import { getActiveOrganizationId } from "@/lib/organization-authorization";
import { getOrganizationMemberOptions } from "@/repositories/organization-member-repository";

export default async function ProposalCreatePage() {
    await requirePageAccess("/dashboard/proposals");
    const organizationId = await getActiveOrganizationId();
    const assignees = organizationId
        ? await getOrganizationMemberOptions(organizationId)
        : [];
    const queryClient = getQueryClient();

    await queryClient.prefetchQuery({
        queryKey: customerKeys.combobox(""),
        queryFn: () => GetCustomerOptions("")
    })
    return (
        <DashboardContainer title="Create Proposal" back={{ href: "/dashboard/proposals", label: "Back to proposals" }}>
            <HydrationBoundary state={dehydrate(queryClient)}>
                <ProposalCreateEditForm assignees={assignees} />
            </HydrationBoundary>
        </DashboardContainer>
    )
}