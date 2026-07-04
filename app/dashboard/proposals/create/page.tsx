export const metadata = {
  title: "Create Proposals"
};

import { ProposalCreateEditForm } from "@/components/proposal/form";
import DashboardContainer from "../../dashboard-container";
import { getQueryClient } from "@/lib/query-client";
import { customerKeys } from "@/components/customers/customer-query-key";
import { GetCustomerOptions } from "@/actions/customer";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

export default async function ProposalCreatePage() {
    const queryClient = getQueryClient();

    await queryClient.prefetchQuery({
        queryKey: customerKeys.combobox(""),
        queryFn: () => GetCustomerOptions("")
    })
    console.log(customerKeys.combobox(""))
    return (
        <DashboardContainer title="Create Proposal">
            <HydrationBoundary state={dehydrate(queryClient)}>
                <ProposalCreateEditForm />
            </HydrationBoundary>
        </DashboardContainer>
    )
}