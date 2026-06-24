"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { GetCustomers } from "@/actions/customer";
import { DataTable } from "./DataTable";
import { columns } from "./columns";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/use-debounce";

export function CustomersTable() {
  const [search, setSearch] = useState("");

  const debouncedSearch = useDebounce(
    search,
    500
  );

  const [pagination, setPagination] =
    useState({
      pageIndex: 0,
      pageSize: 10,
    });

  const { data, isLoading } = useQuery({
    queryKey: [
      "customers",
      pagination.pageIndex,
      pagination.pageSize,
      debouncedSearch,
    ],

    queryFn: () =>
      GetCustomers({
        page: pagination.pageIndex,
        pageSize: pagination.pageSize,
        search:
          debouncedSearch.trim() || undefined,
        sortDirection: "desc",
      }),
  });

  return (
    <div className="space-y-4">
      <Input
        placeholder="Search customers..."
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);

          // reset to first page when searching
          setPagination((prev) => ({
            ...prev,
            pageIndex: 0,
          }));
        }}
      />

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        total={data?.pagination.total ?? 0}
        pagination={pagination}
        onPaginationChange={setPagination}
      />
    </div>
  );
}