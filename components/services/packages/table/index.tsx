"use client"

import { GetServicesPackages } from "@/actions/services";
import { DataTable } from "@/components/data-table";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/use-debounce";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { columns } from "./columns";
import { servicePackageKeys } from "../../util";

export function ServicesPackagesTable({ initialQuery }: {
    initialQuery: {
        key: string;
        page: number;
        pageSize: number;
        search?: string;
        sortDirection: "asc" | "desc";
        isActive?: boolean;
        isPopular?: boolean;
        serviceId?: string;
    }
}) {
    const [search, setSearch] = useState(initialQuery.search ?? "");

    const [isActive, setIsActive] = useState<boolean | undefined>(
        initialQuery.isActive
    );

    const [isPopular, setIsPopular] = useState<boolean | undefined>(
        initialQuery.isPopular
    );
    const debouncedSearch = useDebounce(search, 500);
    const [pagination, setPagination] = useState({
        pageIndex: initialQuery.page,
        pageSize: initialQuery.pageSize,
    });

    const normalizedSearch = debouncedSearch?.trim() || undefined;
    const query = {
        page: pagination.pageIndex,
        pageSize: pagination.pageSize,
        search: normalizedSearch,
        sortDirection: initialQuery.sortDirection,
        isActive,
        isPopular,
        serviceId: initialQuery.serviceId,
    } as const;

    const { data } = useQuery({
        queryKey: servicePackageKeys.list(query),
        queryFn: () => GetServicesPackages({
            page: pagination.pageIndex,
            pageSize: pagination.pageSize,
            search: normalizedSearch,
            sortDirection: initialQuery.sortDirection,
            isActive,
            isPopular,
            serviceId: initialQuery.serviceId,
        })
    })
    return (
        <div className="space-y-4">
            <div className="flex justify-center items-center gap-4">
                <Input
                    placeholder="Search packages..."
                    value={search}
                    onChange={(e) => {
                        setSearch(e.target.value);
                        setPagination((prev) => ({
                            ...prev,
                            pageIndex: 0,
                        }));
                    }}
                />
                <FieldGroup>
                    <Field orientation={"horizontal"}>
                        <Checkbox id="isActive" name="isActive" checked={isActive} onCheckedChange={(value) => {
                            setIsActive(value ? true : undefined);
                            setPagination((prev) => ({
                                ...prev,
                                pageIndex: 0,
                            }));
                        }} />
                        <FieldLabel htmlFor="isActive">Show Active Packages</FieldLabel>
                    </Field>
                    <Field orientation={"horizontal"}>
                        <Checkbox id="isPopular" name="isPopular" checked={isPopular} onCheckedChange={(value) => {
                            setIsPopular(value ? true : undefined);
                            setPagination((prev) => ({
                                ...prev,
                                pageIndex: 0,
                            }));
                        }} />
                        <FieldLabel htmlFor="isPopular">Show Popular Packages</FieldLabel>
                    </Field>
                </FieldGroup>
            </div>
            <DataTable
                columns={columns}
                data={data?.data?.data ?? []}
                total={data?.data?.pagination.total ?? 0}
                pagination={pagination}
                onPaginationChange={setPagination}
            />
        </div>
    );
}