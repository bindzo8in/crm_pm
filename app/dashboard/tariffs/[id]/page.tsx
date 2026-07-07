import { getTariffGridById, getAvailableServicePackages } from "@/actions/tariffs";
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

  return (
    <TariffClientPage 
      initialGrid={gridResult.data} 
      availablePackages={packagesResult.success ? packagesResult.data || [] : []} 
    />
  );
}
