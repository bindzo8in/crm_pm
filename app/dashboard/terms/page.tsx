export const metadata = {
  title: "Terms"
};

import { PlusIcon } from "lucide-react";
import DashboardContainer from "../dashboard-container";
import { TermQuerySchema } from "@/lib/schemas/term-schema";
import { getQueryClient } from "@/lib/query-client";
import { termsKeys } from "@/components/services/util";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { TermsTable } from "@/components/services/terms/table";
import { GetTerms } from "@/actions/terms";
import { requirePageAccess } from "@/lib/auth-guard";

export default async function TermsPage({ searchParams }: PageProps<"/dashboard/terms">) {
    await requirePageAccess("/dashboard/terms");
    const { page, pageSize, search, sortDirection, isActive, isDefault } = await searchParams;
    const initialQuery: TermQuerySchema = {
        page: Number(page ?? 0),
        pageSize: Number(pageSize ?? 10),

        search:
            typeof search === "string"
                ? search
                : undefined,

        sortDirection: sortDirection === "asc" ? "asc" : "desc",
        isActive: isActive === "true" ? true : isActive === "false" ? false : undefined,
        isDefault: isDefault === "true" ? true : isDefault === "false" ? false : undefined,
    } as const;

    const queryClient = getQueryClient();

    await queryClient.prefetchQuery({
        queryKey: termsKeys.list(initialQuery),
        queryFn: () => GetTerms(initialQuery)
    })

    return (
        <DashboardContainer title="Service Terms" action={{
            href: "/dashboard/terms/create",
            label: "Add Term",
            icon: <PlusIcon />,
        }}>
            <HydrationBoundary state={dehydrate(queryClient)}>
                <TermsTable initialQuery={initialQuery} />
            </HydrationBoundary>
        </DashboardContainer>
    )
}