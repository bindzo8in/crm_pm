import { GetServices } from "@/actions/services";
import { ServicesTable } from "@/components/services/table";
import { getQueryClient } from "@/lib/query-client";
import DashboardContainer from "../dashboard-container";
import { PlusIcon } from "lucide-react";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
const serviceKeys = {
  list: (
    page: number,
    pageSize: number,
    search?: string,
    isActive?: boolean
  ) =>
    [
      "services",
      page,
      pageSize,
      search,
      isActive,
    ] as const,
};
export default async function ServicesPage() {
    const queryClient = getQueryClient();
    const search = undefined;
    const isActive = undefined;
    await queryClient.prefetchQuery({
        queryKey: serviceKeys.list(0, 10, search, isActive),
        queryFn: () => GetServices({
            page: 0,
            pageSize: 10,
            search: "",
            sortDirection: "desc",
        }),
    })

    return (
        <DashboardContainer title="Services" action={{ href: "/dashboard/services/create", icon: <PlusIcon />, label: "Create Service" }}>
            <HydrationBoundary state={dehydrate(queryClient)}>
                <ServicesTable />
            </HydrationBoundary>
        </DashboardContainer>
    )
}