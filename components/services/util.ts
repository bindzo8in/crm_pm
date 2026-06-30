export const getServicePackagesQueryKey = ({
    page,
    pageSize,
    search,
    isActive,
    isPopular,
    serviceId,
    sortDirection,
}: {
    page: number;
    pageSize: number;
    search?: string;
    isActive?: boolean;
    isPopular?: boolean;
    serviceId?: string;
    sortDirection: "asc" | "desc";
}) => [
    "services-packages",
    page,
    pageSize,
    search,
    isActive,
    isPopular,
    serviceId,
    sortDirection,
] as const;

// lib/query-keys.ts

export const serviceKeys = {
    all: ["services"] as const,

    list: (query: {
        page: number;
        pageSize: number;
        search?: string;
        isActive?: boolean;
        sortDirection: "asc" | "desc";
    }) =>
        [
            ...serviceKeys.all,
            query.page,
            query.pageSize,
            query.search,
            query.isActive,
            query.sortDirection,
        ] as const,
};

export const servicePackageKeys = {
    all: ["service-packages"] as const,

    list: (query: {
        page: number;
        pageSize: number;
        search?: string;
        isActive?: boolean;
        isPopular?: boolean;
        serviceId?: string;
        sortDirection: "asc" | "desc";
    }) =>
        [
            ...servicePackageKeys.all,
            query.page,
            query.pageSize,
            query.search,
            query.isActive,
            query.isPopular,
            query.serviceId,
            query.sortDirection,
        ] as const,
};

export const termsKeys = {
    all: ["terms"] as const,
    list: (query: {
        page: number;
        pageSize: number;
        search?: string;
        isActive?: boolean;
        isDefault?: boolean;
        sortDirection: "asc" | "desc";
    }) =>
        [
            ...termsKeys.all,
            query.page,
            query.pageSize,
            query.search,
            query.isActive,
            query.isDefault,
            query.sortDirection,
        ] as const,
}