"use client";

import {
  updateTariffGridPackages,
  type getAvailableServicePackages,
  type getTariffGridById,
} from "@/actions/tariffs";
import { Button } from "@/components/ui/button";
import { PricingSummaryBlockViewer } from "@/components/proposal/builder/composer/pricing-summary-block-viewer";
import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

type ActionData<T> = T extends { success: true; data?: infer Data } ? Data : never;
type InitialGrid = NonNullable<ActionData<Awaited<ReturnType<typeof getTariffGridById>>>>;
type AvailablePackage = NonNullable<
  ActionData<Awaited<ReturnType<typeof getAvailableServicePackages>>>
>[number];
type SelectedPackage = AvailablePackage & { isStartsFrom: boolean };

export function TariffClientPage({
  initialGrid,
  availablePackages,
}: {
  initialGrid: InitialGrid;
  availablePackages: AvailablePackage[];
}) {
  const [selectedPackages, setSelectedPackages] = useState<SelectedPackage[]>(
    () => initialGrid.packages.map(({ package: pkg, isStartsFrom }) => ({
      ...pkg,
      isStartsFrom,
    }))
  );
  const [isSaving, setIsSaving] = useState(false);
  const [packageToAdd, setPackageToAdd] = useState<string>("");

  const handleAddPackage = (packageId: string) => {
    if (!packageId) return;
    const pkg = availablePackages.find((item) => item.id === packageId);
    if (!pkg) return;

    if (selectedPackages.some((item) => item.id === pkg.id)) {
      toast.error("Package is already in the grid");
      setPackageToAdd("");
      return;
    }

    setSelectedPackages((current) => [...current, { ...pkg, isStartsFrom: false }]);
    setPackageToAdd("");
  };

  const handleRemovePackage = (id: string) => {
    setSelectedPackages((current) => current.filter((pkg) => pkg.id !== id));
  };

  const movePackage = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === selectedPackages.length - 1) return;

    const newPackages = [...selectedPackages];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    [newPackages[index], newPackages[swapIndex]] = [newPackages[swapIndex], newPackages[index]];
    setSelectedPackages(newPackages);
  };

  const toggleStartsFrom = (id: string, checked: boolean) => {
    setSelectedPackages((current) =>
      current.map((pkg) => pkg.id === id ? { ...pkg, isStartsFrom: checked } : pkg)
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const packagesToSave = selectedPackages.map(p => ({ id: p.id, isStartsFrom: p.isStartsFrom }));
      const result = await updateTariffGridPackages(initialGrid.id, packagesToSave);
      if (result.success) {
        toast.success("Tariff grid saved successfully");
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  const previewProposal = {
    id: "preview",
    currency: "INR",
    proposalServices: selectedPackages.map((pkg) => ({
      id: pkg.id,
      serviceName: pkg.service?.name || "Service",
      packageName: pkg.name,
      isStartsFrom: pkg.isStartsFrom,
      items: pkg.items.map((item) => ({
        total: item.unitPrice * item.quantity
      })),
      features: pkg.features,
    }))
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          {initialGrid.description && (
            <p className="break-words text-sm text-muted-foreground">{initialGrid.description}</p>
          )}
          <p className="mt-1 text-sm text-muted-foreground">
            Choose packages, arrange their order, and preview the comparison.
          </p>
        </div>
        <Button className="w-full sm:w-auto" onClick={handleSave} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save grid layout"}
        </Button>
      </div>

      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(18rem,24rem)_minmax(0,1fr)]">
        <section aria-labelledby="grid-packages-heading" className="min-w-0 space-y-5 rounded-xl border bg-card p-4 sm:p-5">
          <div>
            <h2 id="grid-packages-heading" className="text-lg font-semibold">Grid columns</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Add packages to compare, then arrange them in order.
            </p>
          </div>

          <div className="flex min-w-0 gap-2">
            <Select
              value={packageToAdd}
              onValueChange={handleAddPackage}
              disabled={availablePackages.length === 0}
            >
              <SelectTrigger aria-label="Add package to tariff grid" className="min-w-0 flex-1">
                <SelectValue
                  placeholder={availablePackages.length > 0 ? "Select a package to add..." : "No active packages to add"}
                />
              </SelectTrigger>
              <SelectContent>
                {availablePackages.map((pkg) => (
                  <SelectItem key={pkg.id} value={pkg.id}>
                    {pkg.service?.name} - {pkg.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            {selectedPackages.length === 0 ? (
              <div className="rounded-lg border border-dashed px-4 py-8 text-center">
                <p className="font-medium">No packages selected</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Add a service package to build this tariff comparison.
                </p>
              </div>
            ) : (
              selectedPackages.map((pkg, index) => (
                <div key={pkg.id} className="group flex min-w-0 items-center gap-2 rounded-lg border bg-background p-3 sm:gap-3">
                  <div className="flex shrink-0 flex-col">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Move ${pkg.name} up`}
                      className="size-9"
                      onClick={() => movePackage(index, "up")}
                      disabled={index === 0}
                    >
                      <ArrowUp className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Move ${pkg.name} down`}
                      className="size-9"
                      onClick={() => movePackage(index, "down")}
                      disabled={index === selectedPackages.length - 1}
                    >
                      <ArrowDown className="size-4" />
                    </Button>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{pkg.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{pkg.service?.name}</p>
                    <div className="mt-2 flex items-start gap-2">
                      <Checkbox
                        id={`starts-from-${pkg.id}`}
                        checked={pkg.isStartsFrom}
                        onCheckedChange={(checked) => toggleStartsFrom(pkg.id, checked === true)}
                      />
                      <label
                        htmlFor={`starts-from-${pkg.id}`}
                        className="cursor-pointer text-xs leading-5 text-muted-foreground"
                      >
                        Show starting price
                      </label>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove ${pkg.name} from tariff grid`}
                    className="size-9 shrink-0 text-destructive sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                    onClick={() => handleRemovePackage(pkg.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </section>

        <section aria-labelledby="tariff-preview-heading" className="min-w-0 rounded-xl border bg-muted/10 p-4 sm:p-6">
          <h2 id="tariff-preview-heading" className="mb-4 text-lg font-semibold">
            Live preview
          </h2>
          <div className="min-w-0 overflow-x-auto rounded-lg border bg-background p-3 sm:p-5">
            <PricingSummaryBlockViewer proposal={previewProposal} />
          </div>
        </section>
      </div>
    </div>
  );
}
