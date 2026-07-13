import { getPublicTariffGridById } from "@/actions/tariffs";
import { notFound } from "next/navigation";
import { PricingSummaryBlockViewer } from "@/components/proposal/builder/composer/pricing-summary-block-viewer";
import Link from "next/link";
import { TariffClientGreeting } from "@/components/tariffs/tariff-client-greeting";
import { Suspense } from "react";
import { ArrowLeft, IndianRupee } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TariffFooter } from "@/components/tariffs/tariff-footer";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getPublicTariffGridById(id);
  
  if (!result.success || !result.data) {
    return { title: "Tariff Not Found" };
  }
  
  return {
    title: `${result.data.name} (USD) | Pricing & Packages`,
    description: result.data.description || "View our service packages and pricing options in USD.",
  };
}

export default async function PublicTariffGridUsdPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getPublicTariffGridById(id);

  if (!result.success || !result.data) {
    notFound();
  }

  const grid = result.data;

  // Convert ServicePackages to the format PricingSummaryBlockViewer expects
  const mockProposal = {
    id: grid.id,
    currency: "USD",
    proposalServices: grid.packages.map(pkg => ({
      id: pkg.id,
      serviceName: pkg.package.service?.name || "Service",
      packageName: pkg.package.name,
      isStartsFrom: pkg.isStartsFrom,
      items: pkg.package.items?.map((item: any) => ({
        total: item.unitPriceUSD * item.quantity
      })) || [],
      features: pkg.package.features || []
    }))
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12 pb-24">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="mb-10 text-center max-w-3xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <Link href="/tariffs">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to all packages
              </Button>
            </Link>
            <Link href={`/tariffs/${grid.id}`}>
              <Button variant="outline" size="sm" className="text-primary hover:text-primary">
                <IndianRupee className="mr-2 h-4 w-4" />
                View in INR
              </Button>
            </Link>
          </div>
          
          <h1 className="text-4xl font-extrabold tracking-tight mb-4 text-foreground">
            {grid.name} for <Suspense fallback={<span className="text-primary">Your Business</span>}><TariffClientGreeting defaultText="Your Business" /></Suspense>
          </h1>
          {grid.description && (
            <p className="text-lg text-muted-foreground">
              {grid.description}
            </p>
          )}
        </div>

        <div className="bg-background rounded-2xl shadow-xl border overflow-hidden p-6 md:p-10">
          <PricingSummaryBlockViewer proposal={mockProposal} />
        </div>
      </div>
      <TariffFooter />
    </div>
  );
}
