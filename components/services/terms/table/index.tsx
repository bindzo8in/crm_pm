"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { GetTerms } from "@/actions/terms";
import { columns } from "./columns";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/use-debounce";
import { DataTable } from "@/components/data-table";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";

import { TermQuerySchema } from "@/lib/schemas/term-schema";
import { termsKeys } from "../../util";

export function TermsTable({ initialQuery }: { initialQuery: TermQuerySchema }) {
    const [search, setSearch] = useState(initialQuery.search ?? "");
    const [isActive, setIsActive] = useState(initialQuery.isActive);
    const [isDefault, setIsDefault] = useState(initialQuery.isDefault);
    const [pagination, setPagination] = useState({
        pageIndex: initialQuery.page,
        pageSize: initialQuery.pageSize,
    });
    const debouncedSearch = useDebounce(search, 500);

    const normalizedSearch = debouncedSearch.trim() || undefined;

    const query: TermQuerySchema = {
        page: pagination.pageIndex,
        pageSize: pagination.pageSize,
        search: normalizedSearch,
        isActive: isActive ? true : undefined,
        isDefault: isDefault ? true : undefined,
        sortDirection: initialQuery.sortDirection,
    };

    const { data } = useQuery({
        queryKey: termsKeys.list(query),
        queryFn: () => GetTerms(query),
    });

    return (
        <div className="space-y-4">
            <div className="flex justify-center items-center gap-4">
                <Input
                    placeholder="Search terms..."
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
                        <Checkbox
                            id="isActive"
                            name="isActive"
                            checked={isActive}
                            onCheckedChange={(value) => {
                                setIsActive(value === true);
                                setPagination((prev) => ({
                                    ...prev,
                                    pageIndex: 0,
                                }));
                            }}
                        />
                        <FieldLabel htmlFor="isActive">Show Active Terms</FieldLabel>
                    </Field>
                    <Field orientation={"horizontal"}>
                        <Checkbox
                            id="isDefault"
                            name="isDefault"
                            checked={isDefault}
                            onCheckedChange={(value) => {
                                setIsDefault(value === true);
                                setPagination((prev) => ({
                                    ...prev,
                                    pageIndex: 0,
                                }));
                            }}
                        />
                        <FieldLabel htmlFor="isDefault">Show Default Terms</FieldLabel>
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