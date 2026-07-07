import { getTariffGrids } from "@/actions/tariffs";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import { TariffGridList } from "./tariff-grid-list";

export const metadata = {
  title: "Manage Tariffs | CRM",
};

export default async function TariffsPage() {
  const result = await getTariffGrids();
  const grids = result.success && result.data ? result.data : [];

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Tariff Grids</h2>
          <p className="text-muted-foreground">Manage your standalone package comparison grids.</p>
        </div>
        <Link href="/dashboard/tariffs/create">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Tariff Grid
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-6">
        <TariffGridList grids={grids} />
      </div>
    </div>
  );
}
