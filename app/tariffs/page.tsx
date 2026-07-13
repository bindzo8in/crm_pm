import { getPublicTariffGrids } from "@/actions/tariffs";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { format } from "date-fns";
import { PackageOpen } from "lucide-react";

import { TariffClientGreeting } from "@/components/tariffs/tariff-client-greeting";
import { Suspense } from "react";
import { TariffFooter } from "@/components/tariffs/tariff-footer";

export const metadata = {
  title: "Service Tariffs | Our Packages",
};

export default async function PublicTariffsPage() {
  const result = await getPublicTariffGrids();
  const grids = result.success && result.data ? result.data : [];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12 pb-24">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold tracking-tight mb-4">
            Solutions Tailored for <Suspense fallback={<span className="text-primary">Your Business</span>}><TariffClientGreeting defaultText="Your Business" /></Suspense>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Explore flexible service packages designed to help your business grow with scalable digital solutions.
          </p>
        </div>

        {grids.length === 0 ? (
          <div className="text-center py-20 bg-card rounded-2xl shadow-sm border border-dashed max-w-2xl mx-auto">
            <PackageOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-medium text-foreground">No Tariffs Available</h3>
            <p className="text-muted-foreground mt-2">Check back later for updated service packages.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {grids.map((grid) => (
              <div key={grid.id} className="bg-card border rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col h-full">
                <div className="flex-1">
                  <h3 className="font-bold text-xl mb-2 text-card-foreground">{grid.name}</h3>
                  {grid.description && (
                    <p className="text-muted-foreground text-sm line-clamp-3 mb-4">{grid.description}</p>
                  )}
                </div>
                
                <div className="pt-4 mt-4 border-t border-border flex items-center justify-between text-sm text-muted-foreground mb-6">
                  <span className="font-medium bg-muted/50 px-2 py-1 rounded-md">{grid._count.packages} Options</span>
                  <span>Updated {format(new Date(grid.updatedAt), "MMM d, yyyy")}</span>
                </div>
                
                <Link href={`/tariffs/${grid.id}`} className="mt-auto">
                  <Button className="w-full font-medium" variant="default">
                    View Pricing
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
      <TariffFooter />
    </div>
  );
}
