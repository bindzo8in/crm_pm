"use client";

import { useEffect, useRef, useState } from "react";
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
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const { data: packages = [], error, isError, isLoading, refetch } = useQuery({
    queryKey: ["service-package-search", search],
    queryFn: async () => {
      const response = await searchServicePackages(search);
      if (!response.success) {
        throw new Error(response.message || "Could not load service packages.");
      }
      return response.data ?? [];
    },
    enabled: open,
  });

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !containerRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative w-full sm:w-auto">
      <Button
        ref={triggerRef}
        type="button"
        variant="outline"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls="service-package-search-panel"
        className="w-full gap-2 sm:w-auto"
      >
        <PackageIcon className="h-4 w-4" />
        <span>Browse packages</span>
      </Button>

      {open && (
        <div
          id="service-package-search-panel"
          className="absolute right-0 top-12 z-50 w-[min(380px,calc(100vw-2rem))] rounded-lg border bg-popover p-3 text-popover-foreground shadow-md"
        >
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
            ) : isError ? (
              <div className="flex items-center justify-between gap-3 px-3 py-2 text-sm text-destructive">
                <span>{error instanceof Error ? error.message : "Could not load service packages."}</span>
                <button
                  type="button"
                  className="shrink-0 underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => void refetch()}
                >
                  Try again
                </button>
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
                    <button
                      type="button"
                      key={pkg.id}
                      onClick={() => {
                        onSelectPackage(pkg);
                        setOpen(false);
                      }}
                      className="flex w-full flex-col rounded-md border p-2.5 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                    </button>
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
