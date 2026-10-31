import { getAvailableServicePackages } from "@/actions/tariffs";
import DashboardContainer from "@/app/dashboard/dashboard-container";
import CreateTariffGridForm from "@/components/tariffs/create-tariff-grid-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CircleAlert } from "lucide-react";

export const metadata = {
  title: "Create tariff grid",
};

export default async function CreateTariffGridPage() {
  const packagesResult = await getAvailableServicePackages();

  return (
    <DashboardContainer
      title="Create tariff grid"
      back={{
        href: "/dashboard/tariffs",
        label: "Back to tariffs",
      }}
      flush
    >
      {packagesResult.success && packagesResult.data ? (
        <CreateTariffGridForm packages={packagesResult.data} />
      ) : (
        <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-8 sm:py-8">
          <Alert variant="destructive">
            <CircleAlert />
            <AlertTitle>Packages could not be loaded</AlertTitle>
            <AlertDescription>{packagesResult.message}</AlertDescription>
          </Alert>
        </div>
      )}
    </DashboardContainer>
  );
}
