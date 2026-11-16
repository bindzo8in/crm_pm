export const metadata = {
  title: "Edit Proposals"
};

import { ProposalCreateEditForm } from "@/components/proposal/form";
import { getProposalForEdit } from "@/actions/proposal";
import { differenceInDays } from "date-fns";
import { getQueryClient } from "@/lib/query-client";
import { customerKeys } from "@/components/customers/customer-query-key";
import { GetCustomerOptions } from "@/actions/customer";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { requirePageAccess } from "@/lib/auth-guard";
import DashboardContainer from "@/app/dashboard/dashboard-container";
import { getActiveOrganizationId } from "@/lib/organization-authorization";
import { getOrganizationMemberOptions } from "@/repositories/organization-member-repository";

interface ProposalEditPageProps {
    params: Promise<{ id: string }>;
}

export default async function ProposalEditPage({ params }: ProposalEditPageProps) {
    const { id } = await params;
    
    await requirePageAccess("/dashboard/proposals");
    const organizationId = await getActiveOrganizationId();
    const assignees = organizationId
        ? await getOrganizationMemberOptions(organizationId)
        : [];

    const result = await getProposalForEdit(id);
    const proposal = result.success ? result.data : null;

    if (!proposal) {
        return (
            <DashboardContainer title="Edit Proposal" back={{ href: "/dashboard/proposals", label: "Back to proposals" }}>
                <div className="flex h-64 items-center justify-center text-gray-500">
                    <p>Proposal not found.</p>
                </div>
            </DashboardContainer>
        );
    }

    if (proposal.status !== "DRAFT") {
        return (
            <DashboardContainer title="Edit Proposal" back={{ href: "/dashboard/proposals", label: "Back to proposals" }}>
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

    let validUntilEnum: "07_Days" | "15_Days" | "30_Days" = "07_Days";
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
        notes: proposal.notes ?? "",
        validUntil: validUntilEnum,
        currency: proposal.currency === "USD" ? "USD" as const : "INR" as const,
        exchangeRate: proposal.exchangeRate,
        placeOfSupply: proposal.placeOfSupply,
        assignedToId: proposal.assignedToId,
    };

    return (
        <DashboardContainer title={`Edit Proposal - ${proposal.title}`} back={{ href: "/dashboard/proposals", label: "Back to proposals" }}>
            <HydrationBoundary state={dehydrate(queryClient)}>
                <ProposalCreateEditForm initialData={initialData} assignees={assignees} />
            </HydrationBoundary>
        </DashboardContainer>
    );
}
