export const metadata = {
  title: "Edit Proposals"
};

import { ProposalCreateEditForm } from "@/components/proposal/form";
import { differenceInDays } from "date-fns";
import { getQueryClient } from "@/lib/query-client";
import { customerKeys } from "@/components/customers/customer-query-key";
import { GetCustomerOptions } from "@/actions/customer";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import DashboardContainer from "@/app/dashboard/dashboard-container";

interface ProposalEditPageProps {
    params: Promise<{ id: string }>;
}

export default async function ProposalEditPage({ params }: ProposalEditPageProps) {
    const { id } = await params;
    
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session?.user) {
        redirect("/login");
    }

    const proposal = await prisma.proposal.findUnique({
        where: { id }
    });

    if (!proposal) {
        return (
            <DashboardContainer title="Edit Proposal">
                <div className="flex h-64 items-center justify-center text-gray-500">
                    <p>Proposal not found.</p>
                </div>
            </DashboardContainer>
        );
    }

    if (proposal.status !== "DRAFT") {
        return (
            <DashboardContainer title="Edit Proposal">
                <div className="flex h-64 items-center justify-center text-gray-500">
                    <p>Only proposals in DRAFT status can be edited.</p>
                </div>
            </DashboardContainer>
        );
    }

    const queryClient = getQueryClient();

    await queryClient.prefetchQuery({
        queryKey: customerKeys.combobox(""),
        queryFn: () => GetCustomerOptions("")
    });

    let validUntilEnum = "07_Days";
    if (proposal.validUntil && proposal.createdAt) {
        const days = differenceInDays(proposal.validUntil, proposal.createdAt);
        if (days > 7 && days <= 15) validUntilEnum = "15_Days";
        else if (days > 15) validUntilEnum = "30_Days";
    }

    // Serialize proposal to pass strictly plain data to Client Component
    const initialData = {
        id: proposal.id,
        customerId: proposal.customerId,
        title: proposal.title,
        customerCompanyName: proposal.customerCompanyName,
        customerDisplayName: proposal.customerDisplayName,
        notes: proposal.notes,
        validUntil: validUntilEnum, 
    };

    return (
        <DashboardContainer title={`Edit Proposal - ${proposal.title}`}>
            <HydrationBoundary state={dehydrate(queryClient)}>
                <ProposalCreateEditForm initialData={initialData} />
            </HydrationBoundary>
        </DashboardContainer>
    );
}
