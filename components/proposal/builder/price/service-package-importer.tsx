"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { GetAllActiveServices, GetServicePackages } from "@/actions/services";
import { importServicePackageToProposal } from "@/actions/proposal-pricing";
import { toast } from "sonner";
import { Package, Check, Loader2, Sparkles } from "lucide-react";

interface ServicePackageImporterProps {
  proposalId: string;
  onSuccess: () => void;
}

interface ServiceOption {
  id: string;
  name: string;
}

interface PackageOption {
  id: string;
  name: string;
  description?: string | null;
  totalPrice: number | string;
  isPopular?: boolean;
}

export function ServicePackageImporter({ proposalId, onSuccess }: ServicePackageImporterProps) {
  const [open, setOpen] = useState(false);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");
  const [packages, setPackages] = useState<PackageOption[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState<string>("");
  const [customName, setCustomName] = useState<string>("");
  const [loadingServices, setLoadingServices] = useState(false);
  const [loadingPackages, setLoadingPackages] = useState(false);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (open && services.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoadingServices(true);
      GetAllActiveServices()
        .then((res) => {
          if (res.success && Array.isArray(res.data)) {
            setServices(res.data);
          } else {
            toast.error(res.message || "Failed to load services");
          }
        })
        .catch(() => toast.error("Error loading services"))
        .finally(() => setLoadingServices(false));
    }
  }, [open, services.length]);

  useEffect(() => {
    if (selectedServiceId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoadingPackages(true);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedPackageId("");
      GetServicePackages(selectedServiceId)
        .then((res) => {
          if (res.success && Array.isArray(res.data)) {
            setPackages(
              res.data.map((pkg) => ({
                ...pkg,
                totalPrice: Number(pkg.totalPrice),
              }))
            );
          }
        })
        .catch(() => toast.error("Error loading packages"))
        .finally(() => setLoadingPackages(false));
    } else {
      setPackages([]);
      setSelectedPackageId("");
    }
  }, [selectedServiceId]);

  const handleImport = async () => {
    if (!selectedServiceId || !selectedPackageId) {
      toast.error("Please select both a service and a package");
      return;
    }

    setImporting(true);
    try {
      const res = await importServicePackageToProposal({
        proposalId,
        serviceId: selectedServiceId,
        packageId: selectedPackageId,
        customName: customName.trim() || null,
      });

      if (res.success) {
        toast.success("Package imported successfully!");
        setOpen(false);
        setSelectedServiceId("");
        setSelectedPackageId("");
        setCustomName("");
        onSuccess();
      } else {
        toast.error(res.message || "Failed to import package");
      }
    } catch (error) {
      toast.error("Something went wrong during import");
      console.error(error);
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-medium shadow-md transition-all duration-200 hover:shadow-lg">
          <Sparkles className="size-4" />
          <span>Add Service Package</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl p-6 bg-card text-card-foreground border rounded-xl shadow-2xl">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Package className="size-5 text-primary" />
            <span>Import Service Package</span>
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm">
            Select an active service and choose a package. A snapshot of the package items will be imported into your proposal without modifying the original template.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 my-4">
          {/* Service Selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium">1. Select Service</label>
            <Select
              value={selectedServiceId}
              onValueChange={(val) => setSelectedServiceId(val)}
              disabled={loadingServices || importing}
            >
              <SelectTrigger className="w-full bg-background border border-input rounded-lg h-11 px-3">
                <SelectValue placeholder={loadingServices ? "Loading services..." : "Choose a service..."} />
              </SelectTrigger>
              <SelectContent>
                {services.map((svc) => (
                  <SelectItem key={svc.id} value={svc.id} className="py-2.5 font-medium">
                    {svc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Package Selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium">2. Select Package</label>
            {!selectedServiceId ? (
              <div className="p-4 rounded-lg bg-muted/40 border border-dashed border-muted-foreground/30 text-center text-sm text-muted-foreground">
                Please select a service first to view available packages.
              </div>
            ) : loadingPackages ? (
              <div className="flex items-center justify-center p-6 text-muted-foreground gap-2">
                <Loader2 className="size-5 animate-spin text-primary" />
                <span className="text-sm">Loading packages...</span>
              </div>
            ) : packages.length === 0 ? (
              <div className="p-4 rounded-lg bg-muted/40 border border-dashed border-muted-foreground/30 text-center text-sm text-muted-foreground">
                No active packages found for this service.
              </div>
            ) : (
              <div className="grid gap-3 max-h-60 overflow-y-auto pr-1">
                {packages.map((pkg) => {
                  const isSelected = selectedPackageId === pkg.id;
                  return (
                    <div
                      key={pkg.id}
                      onClick={() => !importing && setSelectedPackageId(pkg.id)}
                      className={`relative flex flex-col p-4 rounded-xl border-2 transition-all cursor-pointer ${
                        isSelected
                          ? "border-primary bg-primary/5 shadow-md"
                          : "border-border hover:border-primary/50 bg-background"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-base">{pkg.name}</span>
                          {pkg.isPopular && (
                            <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-medium px-2 py-0.5 border border-amber-500/20">
                              Popular
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1 font-bold text-primary">
                          <span>₹{Number(pkg.totalPrice).toLocaleString()}</span>
                        </div>
                      </div>
                      {pkg.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {pkg.description}
                        </p>
                      )}
                      {isSelected && (
                        <div className="absolute top-3 right-3 bg-primary text-primary-foreground rounded-full p-0.5">
                          <Check className="size-3" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Custom Display Name (Step 3) */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center justify-between">
              <span>3. Section Display Name (Optional)</span>
              <span className="text-xs font-normal text-muted-foreground">Useful when importing same service more than once</span>
            </label>
            <Input
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder={
                services.find((s) => s.id === selectedServiceId)
                  ? `e.g. ${services.find((s) => s.id === selectedServiceId)?.name} - Option A / Phase 2`
                  : "e.g. Web Development - Phase 2"
              }
              disabled={!selectedPackageId || importing}
              className="h-11 rounded-lg bg-background font-medium"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={importing}>
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={!selectedPackageId || importing}
            className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
          >
            {importing && <Loader2 className="size-4 animate-spin" />}
            <span>{importing ? "Importing..." : "Import Package"}</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
