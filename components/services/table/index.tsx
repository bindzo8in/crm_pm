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
import { serviceKeys } from "../util";

export function ServicesTable({ initialQuery }: { initialQuery: { page: number, pageSize: number, search?: string, isActive?: boolean, sortDirection: "asc" | "desc" } }) {
    const [search, setSearch] = useState(initialQuery.search ?? "");

    const [isActive, setIsActive] = useState(
        initialQuery.isActive ?? false
    );

    const [pagination, setPagination] = useState({
        pageIndex: initialQuery.page,
        pageSize: initialQuery.pageSize,
    });
    const debouncedSearch = useDebounce(search, 500);

    const normalizedSearch =
        debouncedSearch.trim() || undefined;

    const query = {
        page: pagination.pageIndex,
        pageSize: pagination.pageSize,
        search: normalizedSearch,
        isActive: isActive ? true : undefined,
        sortDirection: initialQuery.sortDirection,
    } as const;

    const { data } = useQuery({
        queryKey: serviceKeys.list(query),
        queryFn: () => GetServices(query),
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
                            setIsActive(value === true);
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
                data={(data?.success ? data.data?.data : undefined) ?? []}
                total={(data?.success ? data.data?.pagination.total : undefined) ?? 0}
                pagination={pagination}
                onPaginationChange={setPagination}
            />
        </div>
    );
}