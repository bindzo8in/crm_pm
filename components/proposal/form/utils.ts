"use client";

import { useQuery } from "@tanstack/react-query";
import { GetServicePackages } from "@/actions/services";
import { GetServiceOptions } from "@/actions/services";

export const serviceKeys = {
    all: ["services"] as const,

    options: (search: string) =>
        [...serviceKeys.all, "options", search] as const,
};

export function useServiceOptions(search: string) {
    return useQuery({
        queryKey: serviceKeys.options(search),
        queryFn: () => GetServiceOptions(search),
        staleTime: 1000 * 60 * 5,
    });
}


export const servicePackageKeys = {
    all: ["service-packages"] as const,

    options: (
        serviceId: string,
        search: string,
    ) =>
        [...servicePackageKeys.all, serviceId, search] as const,
};

export function useServicePackages(
    serviceId?: string,
    search = "",
) {
    return useQuery({
        queryKey: servicePackageKeys.options(
            serviceId ?? "",
            search,
        ),

        queryFn: () =>
            GetServicePackages(
                serviceId!,
                search,
            ),

        enabled: !!serviceId,

        staleTime: 1000 * 60 * 5,
    });
}