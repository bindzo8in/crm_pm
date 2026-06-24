"use client";

import { useQuery } from "@tanstack/react-query";

import { getUsers } from "@/actions/user";
import { DataTable } from "./DataTable";
import { columns } from "./columns";
import { useState } from "react";

export default function UsersTable() {

  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => getUsers({ page: pagination.pageIndex, pageSize: pagination.pageSize, search: "" }),
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="px-4">

      <DataTable
        columns={columns}
        data={data?.users ?? []}
        pagination={pagination}
        onPaginationChange={setPagination}
        total={data?.total ?? 0}
      />

    </div>
  );
}