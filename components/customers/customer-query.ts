"use client";

import { useQuery } from "@tanstack/react-query";

import { GetCustomerOptions } from "@/actions/customer";

export const customerKeys = {
    all: ["customers"] as const,

    combobox: (search: string) =>
        [...customerKeys.all, "combobox", search] as const,
};

export function useCustomerOptions(search: string) {
    return useQuery({
        queryKey: customerKeys.combobox(search),
        queryFn: () => GetCustomerOptions(search),
        staleTime: 1000 * 60 * 5,
    });
}