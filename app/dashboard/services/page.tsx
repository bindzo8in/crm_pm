export const metadata = {
  title: "Services"
};

import { GetServices } from "@/actions/services";
import { ServicesTable } from "@/components/services/table";
import { getQueryClient } from "@/lib/query-client";
import DashboardContainer from "../dashboard-container";
import { PlusIcon } from "lucide-react";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { serviceKeys } from "@/components/services/util";
import { requirePageAccess } from "@/lib/auth-guard";

export default async function ServicesPage({
    searchParams,
}: PageProps<"/dashboard/services">) {
    await requirePageAccess("/dashboard/services");
    const params = await searchParams;

    const initialQuery = {
        page: Number(params.page ?? 0),
        pageSize: Number(params.pageSize ?? 10),

        search:
            typeof params.search === "string"
                ? params.search
                : undefined,

        isActive:
            params.isActive === "true"
                ? true
                : undefined,

        sortDirection:
            params.sortDirection === "asc"
                ? "asc"
                : "desc",
    } as const;

    const queryClient = getQueryClient();

    await queryClient.prefetchQuery({
        queryKey: serviceKeys.list(initialQuery),
        queryFn: () => GetServices(initialQuery),
    });

    return (
        <DashboardContainer
            title="Services"
            action={{
                href: "/dashboard/services/create",
                icon: <PlusIcon />,
                label: "Create Service",
            }}
        >
            <HydrationBoundary state={dehydrate(queryClient)}>
                <ServicesTable initialQuery={initialQuery} />
            </HydrationBoundary>
        </DashboardContainer>
    );
}