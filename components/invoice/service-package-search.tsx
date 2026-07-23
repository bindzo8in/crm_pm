"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { searchServicePackages } from "@/actions/invoice";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SearchIcon, PackageIcon, PlusIcon, Loader2Icon } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export type ServicePackageSearchResult = {
  id: string;
  name: string;
  serviceName: string;
  description: string | null;
  totalPrice: number;
  totalPriceUSD: number;
  sacCode?: string | null;
  items: Array<{
    id: string;
    name: string;
    description: string | null;
    quantity: number;
    unitPrice: number;
    unitPriceUSD: number;
    sacCode?: string | null;
    unit: string;
    billingCycle: "ONE_TIME" | "MONTHLY" | "QUARTERLY" | "HALF_YEARLY" | "YEARLY";
  }>;
};

interface ServicePackageSearchProps {
  onSelectPackage: (pkg: ServicePackageSearchResult) => void;
  currency?: string;
}

export function ServicePackageSearch({ onSelectPackage, currency = "INR" }: ServicePackageSearchProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["service-package-search", search],
    queryFn: () => searchServicePackages(search),
    enabled: open,
  });

  const packages = data?.success && data.data ? data.data : [];

  return (
    <div className="relative">
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(!open)}
        className="gap-2"
      >
        <PackageIcon className="h-4 w-4" />
        <span>Add Service Package</span>
      </Button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-[380px] p-3 rounded-lg border bg-popover text-popover-foreground shadow-md">
          <div className="relative mb-3">
            <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search service package..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
              autoFocus
            />
          </div>

          <ScrollArea className="h-[260px] pr-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                <Loader2Icon className="mr-2 h-4 w-4 animate-spin" /> Searching packages...
              </div>
            ) : packages.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No matching service packages found.
              </div>
            ) : (
              <div className="space-y-2">
                {packages.map((pkg) => {
                  const rawPrice = currency === "USD" ? pkg.totalPriceUSD : pkg.totalPrice;
                  const displayPrice = typeof rawPrice === "number" ? rawPrice : Number(rawPrice || 0);
                  const symbol = currency === "USD" ? "$" : "₹";
                  return (
                    <div
                      key={pkg.id}
                      onClick={() => {
                        onSelectPackage(pkg);
                        setOpen(false);
                      }}
                      className="flex flex-col p-2.5 rounded-md border hover:bg-accent cursor-pointer transition-colors"
                    >
                      <div className="flex items-center justify-between font-medium text-sm">
                        <span>{pkg.name}</span>
                        <span className="text-primary font-semibold">
                          {symbol}{displayPrice.toLocaleString("en-IN")}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Service: {pkg.serviceName}
                      </div>
                      {pkg.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
                          {pkg.description}
                        </p>
                      )}
                      <div className="mt-2 text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                        <PlusIcon className="h-3 w-3" /> Includes {pkg.items.length} line items
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
