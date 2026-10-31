"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { GetServices } from "@/actions/services";
import { columns } from "./columns";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/use-debounce";
import { DataTable } from "@/components/data-table";
import { Checkbox } from "@/components/ui/checkbox";
import { serviceKeys } from "../util";
import { CircleAlert, LoaderCircle } from "lucide-react";

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

    const { data, isPending, isError } = useQuery({
        queryKey: serviceKeys.list(query),
        queryFn: () => GetServices(query),
    });

    return (
        <div className="min-w-0 space-y-4">
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Input
                    aria-label="Search services"
                    placeholder="Search services..."
                    value={search}
                    className="h-11 w-full min-w-0 sm:max-w-sm"
                    onChange={(e) => {
                        setSearch(e.target.value);
                        setPagination((prev) => ({
                            ...prev,
                            pageIndex: 0,
                        }));
                    }}
                />
                <div className="flex w-full min-w-0 items-center gap-2 rounded-lg border px-3 py-2 sm:w-auto sm:shrink-0">
                    <Checkbox id="isActive" name="isActive" className="shrink-0" checked={isActive} onCheckedChange={(value) => {
                            setIsActive(value === true);
                            setPagination((prev) => ({
                                ...prev,
                                pageIndex: 0,
                            }));
                        }} />
                    <label htmlFor="isActive" className="min-w-0 cursor-pointer text-sm font-medium leading-snug sm:whitespace-nowrap">
                        Show active services
                    </label>
                </div>
            </div>
            {isPending ? (
                <div role="status" className="flex min-h-32 items-center justify-center gap-2 text-sm text-muted-foreground">
                    <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
                    Loading services
                </div>
            ) : isError || !data?.success ? (
                <div role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                    <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                    <p>{data?.success === false ? data.message : "Services could not be loaded. Try again."}</p>
                </div>
            ) : (
                <DataTable
                    columns={columns}
                    data={data.data?.data ?? []}
                    total={data.data?.pagination.total ?? 0}
                    emptyMessage={normalizedSearch ? "No services match your search." : "No services found."}
                    pagination={pagination}
                    onPaginationChange={setPagination}
                />
            )}
        </div>
    );
}