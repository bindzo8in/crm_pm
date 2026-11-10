import { GetBankAccounts } from "@/actions/bank-accounts";
import DashboardContainer from "@/app/dashboard/dashboard-container";
import { BankAccountsClient } from "@/components/settings/bank-accounts-client";
import { getQueryClient } from "@/lib/query-client";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { requirePageAccess } from "@/lib/auth-guard";

export const metadata = {
  title: "Bank Accounts",
};

export default async function BankAccountsPage() {
  await requirePageAccess("/dashboard/settings");
  const queryClient = getQueryClient();
  const initialQuery = { page: 0, pageSize: 20, search: "" };

  const initialData = await queryClient.fetchQuery({
    queryKey: ["bankAccounts", initialQuery.page, initialQuery.pageSize, initialQuery.search],
    queryFn: async () => {
      const res = await GetBankAccounts(initialQuery);
      if (!res.success) throw new Error(res.error || "Failed to fetch");
      return res;
    }
  });

  return (
    <DashboardContainer title="Business Settings">
      <HydrationBoundary state={dehydrate(queryClient)}>
        <BankAccountsClient
          data={initialData.data}
          initialPagination={{
            ...initialQuery,
            totalCount: initialData.pagination.totalCount,
          }}
        />
      </HydrationBoundary>
    </DashboardContainer>
  );
}
