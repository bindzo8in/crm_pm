import { getTariffGrids } from "@/actions/tariffs";
import { CircleAlert, Plus } from "lucide-react";
import { TariffGridList } from "./tariff-grid-list";
import { requirePageAccess } from "@/lib/auth-guard";
import DashboardContainer from "../dashboard-container";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export const metadata = {
  title: "Manage Tariffs | CRM",
};

export default async function TariffsPage() {
  await requirePageAccess("/dashboard/tariffs");
  const result = await getTariffGrids();
  const grids = result.success && result.data ? result.data : [];

  return (
    <DashboardContainer
      title="Tariffs"
      action={{
        href: "/dashboard/tariffs/create",
        label: "Create tariff grid",
        icon: <Plus />,
      }}
    >
      <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
        Build and share package comparisons tailored to each client.
      </p>
      {!result.success ? (
        <Alert variant="destructive">
          <CircleAlert />
          <AlertTitle>Tariffs could not be loaded</AlertTitle>
          <AlertDescription>{result.message}</AlertDescription>
        </Alert>
      ) : (
        <TariffGridList grids={grids} />
      )}
    </DashboardContainer>
  );
}
