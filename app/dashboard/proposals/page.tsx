export const metadata = {
  title: "Proposals"
};

import { PlusIcon } from "lucide-react";
import DashboardContainer from "../dashboard-container";
import { ProposalQuerySchema } from "@/lib/schemas/proposal-schema";
import { getQueryClient } from "@/lib/query-client";
import { proposalKeys } from "@/components/proposal/util";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { ProposalTable } from "@/components/proposal/table";
import { getProposals } from "@/actions/proposal";

export default async function ProposalsPage({ searchParams }: PageProps<"/dashboard/proposals">) {
    const { page, pageSize, search, sortDirection, status, customerId } = await searchParams;
    const initialQuery: ProposalQuerySchema = {
        page: Number(page ?? 0),
        pageSize: Number(pageSize ?? 10),
        search: typeof search === "string" ? search : undefined,
        sortDirection: sortDirection === "asc" ? "asc" : "desc",
        status: status as any,
        customerId: customerId as any
    } as const;

    const queryClient = getQueryClient()
    await queryClient.prefetchQuery({
        queryKey: proposalKeys.list(initialQuery),
        queryFn: () => getProposals(initialQuery)
    })

    return (
        <DashboardContainer title="Proposals" action={{ href: "/dashboard/proposals/create", label: "Create Proposal", icon: <PlusIcon /> }}>
            <HydrationBoundary state={dehydrate(queryClient)}>
                <ProposalTable initialQuery={initialQuery} />
            </HydrationBoundary>
        </DashboardContainer>
    );
}