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
      <p className="text-sm text-muted-foreground">
        Manage your standalone package comparison grids.
      </p>
      {!result.success ? (
        <Alert variant="destructive">
          <CircleAlert />
          <AlertTitle>Tariffs could not be loaded</AlertTitle>
          <AlertDescription>{result.message}</AlertDescription>
        </Alert>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <TariffGridList grids={grids} />
        </div>
      )}
    </DashboardContainer>
  );
}
