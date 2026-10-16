import DashboardContainer from "@/app/dashboard/dashboard-container";
import { ArrowLeft } from "lucide-react";
import CreateTariffGridForm from "@/components/tariffs/create-tariff-grid-form";

export default function CreateTariffGridPage() {
  return (
    <DashboardContainer
      title="Create tariff grid"
      action={{
        href: "/dashboard/tariffs",
        label: "Back to tariffs",
        icon: <ArrowLeft className="size-4" />,
      }}
    >
      <section className="w-full max-w-2xl rounded-xl border bg-card p-4 sm:p-6">
        <p className="mb-5 text-sm text-muted-foreground">
          Create a comparison grid, then choose the active service packages to include.
        </p>
        <CreateTariffGridForm />
      </section>
    </DashboardContainer>
  );
}
