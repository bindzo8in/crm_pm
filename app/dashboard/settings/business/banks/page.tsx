import { GetBankAccounts } from "@/actions/bank-accounts";
import DashboardContainer from "@/app/dashboard/dashboard-container";
import { BankAccountsClient } from "@/components/settings/bank-accounts-client";
import { getQueryClient } from "@/lib/query-client";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

export const metadata = {
  title: "Bank Accounts",
};

export default async function BankAccountsPage() {
  const queryClient = getQueryClient();

  await queryClient.prefetchQuery({
    queryKey: ["bankAccounts"],
    queryFn: async () => {
      const res = await GetBankAccounts();
      if (!res.success) throw new Error(res.error || "Failed to fetch");
      return res;
    }
  });

  return (
    <DashboardContainer title="Bank Account Details">
      <HydrationBoundary state={dehydrate(queryClient)}>
        <BankAccountsClient data={[]} />
      </HydrationBoundary>
    </DashboardContainer>
  );
}
