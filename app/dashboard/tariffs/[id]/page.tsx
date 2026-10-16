import { getTariffGridById, getAvailableServicePackages } from "@/actions/tariffs";
import DashboardContainer from "@/app/dashboard/dashboard-container";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { TariffClientPage } from "./client-page";

export const metadata = {
  title: "Manage Tariff Grid | CRM",
};

export default async function TariffGridPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [gridResult, packagesResult] = await Promise.all([
    getTariffGridById(id),
    getAvailableServicePackages()
  ]);

  if (!gridResult.success || !gridResult.data) {
    notFound();
  }

  if (!packagesResult.success || !packagesResult.data) {
    return (
      <DashboardContainer title={gridResult.data.name}>
        <Alert variant="destructive">
          <AlertTitle>Packages could not be loaded</AlertTitle>
          <AlertDescription>{packagesResult.message}</AlertDescription>
        </Alert>
      </DashboardContainer>
    );
  }

  return (
    <DashboardContainer
      title={gridResult.data.name}
      action={{
        href: "/dashboard/tariffs",
        label: "Back to tariffs",
        icon: <ArrowLeft className="size-4" />,
      }}
    >
      <TariffClientPage
        initialGrid={gridResult.data}
        availablePackages={packagesResult.data}
      />
    </DashboardContainer>
  );
}
