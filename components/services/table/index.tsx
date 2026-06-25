"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { GetServices } from "@/actions/services";
import { columns } from "./columns";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/use-debounce";
import { DataTable } from "@/components/data-table";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";

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
export function ServicesTable() {
    const [search, setSearch] = useState("");
    const [isActive, setIsActive] = useState(false);
    const debouncedSearch = useDebounce(search, 500);
    const [pagination, setPagination] = useState({
        pageIndex: 0,
        pageSize: 10,
    });

    const normalizedSearch =
        debouncedSearch.trim() || undefined;

    const activeFilter =
        isActive ? true : undefined;

    const { data, isLoading } = useQuery({
        queryKey: serviceKeys.list(pagination.pageIndex, pagination.pageSize, normalizedSearch, activeFilter),
        queryFn: () => GetServices({
            page: pagination.pageIndex,
            pageSize: pagination.pageSize,
            search: debouncedSearch.trim() || undefined,
            sortDirection: "desc",
            ...(isActive && { isActive })
        }),
    });

    return (
        <div className="space-y-4">
            <div className="flex justify-center items-center gap-4">
                <Input
                    placeholder="Search services..."
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
                            setIsActive(value as boolean);
                            setPagination((prev) => ({
                                ...prev,
                                pageIndex: 0,
                            }));
                        }} />
                        <FieldLabel htmlFor="isActive">Show Active Services</FieldLabel>
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