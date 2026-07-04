"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ServicePackageImporter } from "./service-package-importer";
import { ServiceSectionCard } from "./service-card";

import { PricingSummaryCard } from "./pricing-summary-card";
import { PricingApi, PricingData, PricingServiceSection } from "./types";
import { toast } from "sonner";
import {
  Loader2,
  PackageOpen,
  Sparkles,
  Building2,
  FileText,
  Calendar,
  RefreshCw,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface PricingBuilderProps {
  pricingApi: PricingApi;
  entityId: string;
}



interface SortableServiceSectionProps {
  pricingApi: PricingApi;
  service: PricingServiceSection;
  entityId: string;
  onRefresh: () => void;
  idx: number;
  totalCount: number;
  onReorderArrow: (idx: number, dir: "up" | "down") => void;
}

function SortableServiceSection({
  pricingApi,
  service,
  entityId,
  onRefresh,
  idx,
  totalCount,
  onReorderArrow,
}: SortableServiceSectionProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: service.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <ServiceSectionCard
        pricingApi={pricingApi}
        service={service}
        entityId={entityId}
        onRefresh={onRefresh}
        dragHandleProps={{ ...attributes, ...listeners }}
        idx={idx}
        totalCount={totalCount}
        onReorderArrow={onReorderArrow}
      />
    </div>
  );
}

export function PricingBuilder({ entityId, pricingApi }: PricingBuilderProps) {
  const [data, setData] = useState<PricingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const loadPricingData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await pricingApi.getPricing(entityId);
      if (res.success && res.data) {
        setData(res.data as unknown as PricingData);
      } else {
        toast.error(res.message || "Failed to load pricing data");
      }
    } catch (err) {
      toast.error("Error connecting to pricing engine");
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [entityId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadPricingData();
  }, [loadPricingData]);

  const handleServiceReorderArrow = async (index: number, direction: "up" | "down") => {
    if (!data) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= data.services.length) return;

    const currentSvc = data.services[index];
    const targetSvc = data.services[targetIndex];

    const newOrder = [
      { id: currentSvc.id, sortOrder: targetIndex },
      { id: targetSvc.id, sortOrder: index },
    ];

    try {
      const res = await pricingApi.reorderServices(entityId, newOrder);
      if (res.success) {
        loadPricingData(true);
      } else {
        toast.error("Failed to reorder sections");
      }
    } catch {
      toast.error("Reorder error");
    }
  };

  const handleServiceDragEnd = async (event: DragEndEvent) => {
    if (!data) return;
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = data.services.findIndex((s) => s.id === active.id);
      const newIndex = data.services.findIndex((s) => s.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        const newServices = arrayMove(data.services, oldIndex, newIndex);
        const reorderedPayload = newServices.map((svc, idx) => ({
          id: svc.id,
          sortOrder: idx,
        }));
        try {
          const res = await pricingApi.reorderServices(entityId, reorderedPayload);
          if (res.success) {
            loadPricingData(true);
          } else {
            toast.error("Failed to reorder sections");
          }
        } catch {
          toast.error("Reorder error");
        }
      }
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 p-8">
        <div className="relative flex items-center justify-center size-16 rounded-2xl bg-primary/10 text-primary animate-pulse">
          <Sparkles className="size-8 animate-spin" />
        </div>
        <div className="text-center space-y-1">
          <h3 className="font-bold text-lg">Initializing Pricing Engine...</h3>
          <p className="text-sm text-muted-foreground">Loading proposal snapshots and line items</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 p-8 border border-dashed rounded-2xl bg-muted/20">
        <div className="p-4 rounded-full bg-destructive/10 text-destructive">
          <FileText className="size-8" />
        </div>
        <div className="text-center space-y-1">
          <h3 className="font-bold text-lg">Proposal Not Found</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            We couldn&apos;t load the pricing data for this proposal. It may have been removed or you lack authorization.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard/proposals">Back to Proposals</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16">
      {/* Top Banner / Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 p-6 rounded-3xl border border-border/80 bg-gradient-to-r from-card via-card to-primary/5 shadow-lg backdrop-blur-md">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="size-8 p-0 text-muted-foreground hover:text-foreground">
              <Link href="/dashboard/proposals" title="Back to proposals list">
                <ArrowLeft className="size-4" />
              </Link>
            </Button>
            <Badge variant="outline" className="text-xs font-mono px-2.5 py-0.5 bg-background shadow-xs">
              ID: {data.id.slice(-6).toUpperCase()}
            </Badge>
            <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-bold px-2.5 py-0.5 flex items-center gap-1">
              <CheckCircle2 className="size-3" />
              <span>Source of Truth</span>
            </Badge>
            <Badge variant="secondary" className="text-xs uppercase tracking-wider font-semibold px-2.5 py-0.5">
              {data.status}
            </Badge>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
            {data.title}
          </h1>

          <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
            {data.customer && (
              <div className="flex items-center gap-1.5 font-medium text-foreground bg-muted/60 px-2.5 py-1 rounded-lg border border-border/40">
                <Building2 className="size-3.5 text-primary" />
                <span>{data.customer.displayName}</span>
                {data.customer.companyName && (
                  <span className="text-muted-foreground">({data.customer.companyName})</span>
                )}
              </div>
            )}
            {data.validUntil && (
              <div className="flex items-center gap-1.5">
                <Calendar className="size-3.5" />
                <span>Valid until {new Date(data.validUntil).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <Button
            variant="outline"
            size="icon"
            onClick={() => loadPricingData(true)}
            disabled={refreshing}
            className="size-10 rounded-xl"
            title="Refresh Pricing"
          >
            <RefreshCw className={`size-4 ${refreshing ? "animate-spin text-primary" : ""}`} />
          </Button>
          <ServicePackageImporter pricingApi={pricingApi} entityId={entityId} onSuccess={() => loadPricingData(true)} />

          <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 shadow-md rounded-xl h-10 px-4">
            <Link href={`/dashboard/proposals/${entityId}/composer`}>
              <FileText className="size-4" />
              <span className="font-semibold text-xs sm:text-sm">Document Composer</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Service Sections & Line Items */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <span>Service Sections & Line Items</span>
              <Badge variant="secondary" className="rounded-full px-2.5 py-0.5 text-xs font-mono">
                {data.services.length} {data.services.length === 1 ? "Section" : "Sections"}
              </Badge>
            </h2>
          </div>

          {data.services.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 rounded-3xl border-2 border-dashed border-border bg-card/40 text-center space-y-4 shadow-xs">
              <div className="p-5 rounded-2xl bg-primary/10 text-primary shadow-inner">
                <PackageOpen className="size-10" />
              </div>
              <div className="space-y-1 max-w-md">
                <h3 className="text-lg font-bold text-foreground">No Packages Imported Yet</h3>
                <p className="text-sm text-muted-foreground">
                  Get started by importing a service package. A snapshot of all its items will be copied over so you can customize quantities, pricing, and billing cycles freely.
                </p>
              </div>
              <div className="pt-2">
                <ServicePackageImporter pricingApi={pricingApi} entityId={entityId} onSuccess={() => loadPricingData(true)} />
              </div>
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleServiceDragEnd}>
              <SortableContext items={data.services.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-6">
                  {data.services.map((service, idx) => (
                    <SortableServiceSection
                      key={service.id}
                      pricingApi={pricingApi}
                      service={service}
                      entityId={entityId}
                      onRefresh={() => loadPricingData(true)}
                      idx={idx}
                      totalCount={data.services.length}
                      onReorderArrow={handleServiceReorderArrow}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>

        {/* Right Column: Pricing Summary Card */}
        <div className="lg:col-span-4">
          <PricingSummaryCard
            pricingApi={pricingApi}
            entityId={entityId}
            subtotal={data.subtotal}
            initialDiscount={data.discount}
            initialTax={data.tax}
            roundOff={data.roundOff || 0}
            grandTotal={data.grandTotal}
            currency={data.currency}
            onRefresh={() => loadPricingData(true)}
          />
        </div>
      </div>
    </div>
  );
}