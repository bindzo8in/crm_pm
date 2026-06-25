import { getQueryClient } from "@/lib/query-client";
import DashboardContainer from "../dashboard-container";
import { CustomersTable } from "./CustomersTable";
import { GetCustomers } from "@/actions/customer";
import {
  dehydrate,
  HydrationBoundary,
} from "@tanstack/react-query";
import { User } from "lucide-react";

export default async function CustomersPage() {
  const queryClient = getQueryClient();

  await queryClient.prefetchQuery({
    queryKey: ["customers", 0, 10, ""],

    queryFn: () =>
      GetCustomers({
        page: 0,
        pageSize: 10,
        search: "",
        sortDirection: "desc",
      }),
  });

  return (
    <DashboardContainer title="Customers" action={{ href: "/dashboard/customers/create", icon: <User />, label: "Create Customer" }}>
      <HydrationBoundary state={dehydrate(queryClient)}>
        <CustomersTable />
      </HydrationBoundary>
    </DashboardContainer>
  );
}