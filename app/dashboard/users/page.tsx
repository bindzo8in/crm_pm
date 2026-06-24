import { getUsers } from "@/actions/user";
import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query"
import UsersTable from "./UsersTable";
import DashboardContainer from "../dashboard-container";
import { getQueryClient } from "@/lib/query-client";

export default async function TestPage() {

    const queryClient = getQueryClient();

    await queryClient.prefetchQuery({
        queryKey: ['users'],
        queryFn: () => getUsers({ page: 0, pageSize: 10, search: "" }),
    })
    return (
        <DashboardContainer title="Users">
            <HydrationBoundary state={dehydrate(queryClient)}>
                <UsersTable />
            </HydrationBoundary>
        </DashboardContainer>
    )
}