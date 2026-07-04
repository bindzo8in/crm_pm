export const metadata = {
  title: "Packages"
};

import { getQueryClient } from "@/lib/query-client";
import DashboardContainer from "../../dashboard-container";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { GetServicesPackages } from "@/actions/services";
import { ServicesPackagesTable } from "@/components/services/packages/table";
import { servicePackageKeys } from "@/components/services/util";
import { PlusIcon } from "lucide-react";

export default async function ServicePackagePage({
    searchParams,
}: PageProps<"/dashboard/services/packages">) {
    const params = await searchParams;

    const initialQuery = {
        key: "services-packages",

        page: Number(params.page ?? 0),

        pageSize: Number(params.pageSize ?? 10),

        search:
            typeof params.search === "string"
                ? params.search
                : undefined,

        sortDirection:
            params.sortDirection === "asc"
                ? "asc"
                : "desc",

        isActive:
            params.isActive === "true"
                ? true
                : params.isActive === "false"
                    ? false
                    : undefined,

        isPopular:
            params.isPopular === "true"
                ? true
                : params.isPopular === "false"
                    ? false
                    : undefined,

        serviceId:
            typeof params.serviceId === "string"
                ? params.serviceId
                : undefined,
    } as const;

    const queryClient = getQueryClient();

    await queryClient.prefetchQuery({
        queryKey: servicePackageKeys.list(initialQuery),
        queryFn: () => GetServicesPackages(initialQuery),
    });

    const canCreate = Boolean(params.serviceId);

    return (
        <DashboardContainer
            title="Service Packages"
            action={
                canCreate ? {
                    href: `/dashboard/services/${params.serviceId}/create-package`,
                    icon: <PlusIcon />,
                    label: "Create Service Package",
                } : undefined
            }
        >
            <HydrationBoundary state={dehydrate(queryClient)}>
                <ServicesPackagesTable initialQuery={initialQuery} />
            </HydrationBoundary>
        </DashboardContainer>
    );
}