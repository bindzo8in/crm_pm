"use client";

import { updateTariffGridPackages } from "@/actions/tariffs";
import { Button } from "@/components/ui/button";
import { PricingSummaryBlockViewer } from "@/components/proposal/builder/composer/pricing-summary-block-viewer";
import { ArrowLeft, GripVertical, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
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

export function TariffClientPage({ initialGrid, availablePackages }: { initialGrid: any, availablePackages: any[] }) {
  const [selectedPackages, setSelectedPackages] = useState<any[]>(
    initialGrid.packages.map((p: any) => ({
      ...p.package,
      isStartsFrom: p.isStartsFrom || false
    }))
  );
  const [isSaving, setIsSaving] = useState(false);
  const [packageToAdd, setPackageToAdd] = useState<string>("");

  const handleAddPackage = () => {
    if (!packageToAdd) return;
    const pkg = availablePackages.find(p => p.id === packageToAdd);
    if (!pkg) return;
    
    // Check if already added
    if (selectedPackages.find(p => p.id === pkg.id)) {
      toast.error("Package is already in the grid");
      return;
    }

    setSelectedPackages([...selectedPackages, { ...pkg, isStartsFrom: false }]);
    setPackageToAdd("");
  };

  const handleRemovePackage = (id: string) => {
    setSelectedPackages(selectedPackages.filter(p => p.id !== id));
  };

  const movePackage = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === selectedPackages.length - 1) return;

    const newPackages = [...selectedPackages];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    [newPackages[index], newPackages[swapIndex]] = [newPackages[swapIndex], newPackages[index]];
    setSelectedPackages(newPackages);
  };

  const toggleStartsFrom = (id: string, checked: boolean) => {
    setSelectedPackages(selectedPackages.map(p => p.id === id ? { ...p, isStartsFrom: checked } : p));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const packagesToSave = selectedPackages.map(p => ({ id: p.id, isStartsFrom: p.isStartsFrom }));
      const result = await updateTariffGridPackages(initialGrid.id, packagesToSave);
      if (result.success) {
        toast.success("Tariff grid saved successfully");
      } else {
        toast.error(String(result.error));
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  // Convert ServicePackages to the format PricingSummaryBlockViewer expects
  const mockProposal = {
    id: "preview",
    currency: "INR",
    proposalServices: selectedPackages.map(pkg => ({
      id: pkg.id,
      serviceName: pkg.service?.name || "Service",
      packageName: pkg.name,
      isStartsFrom: pkg.isStartsFrom,
      items: pkg.items?.map((item: any) => ({
        total: item.unitPrice * item.quantity
      })) || [],
      features: pkg.features || []
    }))
  };

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/tariffs">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{initialGrid.name}</h2>
            {initialGrid.description && <p className="text-muted-foreground text-sm">{initialGrid.description}</p>}
          </div>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save Grid Layout"}
        </Button>
      </div>

      <div className="grid lg:grid-cols-[400px_1fr] gap-8 items-start">
        {/* Left Column: Manage Packages */}
        <div className="space-y-6 border rounded-xl p-5 bg-card shadow-sm">
          <div>
            <h3 className="text-lg font-semibold mb-1">Grid Columns</h3>
            <p className="text-sm text-muted-foreground mb-4">Add packages to compare and arrange them in order.</p>
            
            <div className="flex gap-2 mb-6">
              <Select 
                value={packageToAdd} 
                onValueChange={(val) => {
                  setPackageToAdd(val);
                  
                  // Auto-add the package
                  if (!val) return;
                  const pkg = availablePackages.find(p => p.id === val);
                  if (!pkg) return;
                  
                  if (selectedPackages.find(p => p.id === pkg.id)) {
                    toast.error("Package is already in the grid");
                    setPackageToAdd("");
                    return;
                  }

                  setSelectedPackages(prev => [...prev, pkg]);
                  
                  // Reset select using a small timeout to allow UI update
                  setTimeout(() => setPackageToAdd(""), 10);
                }}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select a package to add..." />
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
                <div className="text-center py-8 border border-dashed rounded-lg bg-muted/30">
                  <p className="text-sm text-muted-foreground">No packages selected.</p>
                </div>
              ) : (
                selectedPackages.map((pkg, index) => (
                  <div key={pkg.id} className="flex items-center gap-3 p-3 border rounded-lg bg-background group">
                    <div className="flex flex-col gap-0.5">
                      <Button type="button" variant="ghost" size="icon" className="h-5 w-5" onClick={() => movePackage(index, 'up')} disabled={index === 0}>
                        <ArrowLeft className="h-3 w-3 rotate-90" />
                      </Button>
                      <Button type="button" variant="ghost" size="icon" className="h-5 w-5" onClick={() => movePackage(index, 'down')} disabled={index === selectedPackages.length - 1}>
                        <ArrowLeft className="h-3 w-3 -rotate-90" />
                      </Button>
                    </div>
                    <div className="flex-1 truncate">
                      <p className="font-medium text-sm truncate">{pkg.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{pkg.service?.name}</p>
                      
                      <div className="flex items-center space-x-2 mt-2">
                        <Checkbox 
                          id={`starts-from-${pkg.id}`} 
                          checked={pkg.isStartsFrom}
                          onCheckedChange={(checked) => toggleStartsFrom(pkg.id, checked as boolean)}
                        />
                        <label 
                          htmlFor={`starts-from-${pkg.id}`}
                          className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer text-muted-foreground"
                        >
                          Show "Starts from" price
                        </label>
                      </div>
                    </div>
                    <Button type="button" variant="ghost" size="icon" className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleRemovePackage(pkg.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Live Preview */}
        <div className="border rounded-xl p-6 bg-muted/10 shadow-sm min-h-[500px]">
          <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
            Live Preview
          </h3>
          <div className="bg-background rounded-lg p-6 border shadow-sm">
            <PricingSummaryBlockViewer proposal={mockProposal} />
          </div>
        </div>
      </div>
    </div>
  );
}
