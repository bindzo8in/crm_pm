"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { GetCustomers } from "@/actions/customer";
import { DataTable } from "./DataTable";
import { columns } from "./columns";

export function CustomersTable() {
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });

  const { data, isLoading } = useQuery({
    queryKey: [
      "customers",
      pagination.pageIndex,
      pagination.pageSize,
    ],

    queryFn: () =>
      GetCustomers({
        page: pagination.pageIndex,
        pageSize: pagination.pageSize,
        sortDirection: "desc",
      }),
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <DataTable
      columns={columns}
      data={data?.data ?? []}
      total={data?.pagination.total ?? 0}
      pagination={pagination}
      onPaginationChange={setPagination}
    />
  );
}