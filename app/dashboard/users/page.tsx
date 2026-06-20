import { getUsers } from "@/actions/user";
import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query"
import UsersTable from "./UsersTable";
import DashboardContainer from "../dashboard-container";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export default async function TestPage() {
    
const queryClient = new QueryClient();

await queryClient.prefetchQuery({
    queryKey: ['users'],
    queryFn: () => getUsers({page: 0, pageSize: 10}),
})
    return (
        <DashboardContainer title="Users">
        <HydrationBoundary state={dehydrate(queryClient)}>
            <UsersTable />
        </HydrationBoundary>
        </DashboardContainer>
    )
}