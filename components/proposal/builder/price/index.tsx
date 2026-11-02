"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ServicePackageImporter } from "./service-package-importer";
import { ServiceSectionCard, ProposalServiceSection } from "./service-section-card";
import { PricingSummaryCard } from "./pricing-summary-card";
import { getProposalPricing, reorderProposalServices } from "@/actions/proposal-pricing";
import { toast } from "sonner";
import {
  PackageOpen,
  Sparkles,
  FileText,
  RefreshCw,
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
import { ProposalWorkflowNav } from "@/components/proposal/proposal-workflow-nav";
import { ProposalWorkflowActionBar } from "@/components/proposal/proposal-workflow-action-bar";
import { CustomLineItemDialog } from "./custom-line-item-dialog";
import { proposalPricingStepSchema } from "@/lib/schemas/proposal-workflow-schema";

interface ProposalPriceBuilderProps {
  proposalId: string;
}

interface ProposalPricingData {
  id: string;
  title: string;
  status: string;
  currency: string;
  validUntil?: string | null;
  subtotal: number;
  discount: number;
  tax: number;
  roundOff?: number;
  grandTotal: number;
  customer?: {
    id: string;
    displayName: string;
    companyName?: string | null;
  };
  proposalServices: ProposalServiceSection[];
}

interface SortableServiceSectionProps {
  service: ProposalServiceSection;
  proposalId: string;
  currency: string;
  onRefresh: () => void;
  idx: number;
  totalCount: number;
  onReorderArrow: (idx: number, dir: "up" | "down") => void;
}

function SortableServiceSection({
  service,
  proposalId,
  currency,
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
        service={service}
        proposalId={proposalId}
        currency={currency}
        onRefresh={onRefresh}
        dragHandleProps={{ ...attributes, ...listeners }}
        idx={idx}
        totalCount={totalCount}
        onReorderArrow={onReorderArrow}
      />
    </div>
  );
}

export function ProposalPriceBuilder({ proposalId }: ProposalPriceBuilderProps) {
  const [data, setData] = useState<ProposalPricingData | null>(null);
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
      const res = await getProposalPricing(proposalId);
      if (res.success && res.data) {
        setData(res.data as unknown as ProposalPricingData);
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
  }, [proposalId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadPricingData();
  }, [loadPricingData]);

  const handleServiceReorderArrow = async (index: number, direction: "up" | "down") => {
    if (!data) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= data.proposalServices.length) return;

    const currentSvc = data.proposalServices[index];
    const targetSvc = data.proposalServices[targetIndex];

    const newOrder = [
      { id: currentSvc.id, sortOrder: targetIndex },
      { id: targetSvc.id, sortOrder: index },
    ];

    try {
      const res = await reorderProposalServices(proposalId, newOrder);
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
      const oldIndex = data.proposalServices.findIndex((s) => s.id === active.id);
      const newIndex = data.proposalServices.findIndex((s) => s.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        const newServices = arrayMove(data.proposalServices, oldIndex, newIndex);
        const reorderedPayload = newServices.map((svc, idx) => ({
          id: svc.id,
          sortOrder: idx,
        }));
        try {
          const res = await reorderProposalServices(proposalId, reorderedPayload);
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

  if (data.status !== "DRAFT") {
    return (
      <div className="w-full space-y-6">
        <ProposalWorkflowNav
          proposalId={proposalId}
          activeStep={2}
          title={data.title}
          customerName={data.customer?.displayName}
          status={data.status}
          maxAvailableStep={2}
        />
        <section className="max-w-2xl space-y-3 py-4">
          <h2 className="text-lg font-semibold">This proposal is read-only</h2>
          <p className="text-sm text-muted-foreground">
            {data.status} proposals cannot be changed. Duplicate this proposal from the proposals list to create a new draft.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button asChild>
              <Link href={`/dashboard/proposals/${proposalId}/preview`}>View proposal</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard/proposals">Back to proposals</Link>
            </Button>
          </div>
        </section>
      </div>
    );
  }

  const pricingValidation = proposalPricingStepSchema.safeParse({
    services: data.proposalServices.map((service) => ({
      items: service.items.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
    })),
  });
  const sectionCount = data.proposalServices.length;
  const itemCount = data.proposalServices.reduce(
    (total, service) => total + service.items.length,
    0,
  );

  return (
    <div className="space-y-5 pb-28 sm:space-y-6">
      <ProposalWorkflowNav
        proposalId={proposalId}
        activeStep={2}
        title={data.title}
        customerName={data.customer?.displayName}
        status={data.status}
        maxAvailableStep={pricingValidation.success ? 3 : 2}
      />

      <div className="space-y-4 border-b pb-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold tracking-tight">Proposal pricing</h1>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Add services or custom items, then review the total before creating the document.
            </p>
          </div>
          <Badge variant="outline" className="w-fit shrink-0 font-normal">
            {data.currency}
          </Badge>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
          <div className="min-w-0 [&_button]:w-full sm:[&_button]:w-auto">
            <ServicePackageImporter proposalId={proposalId} onSuccess={() => loadPricingData(true)} />
          </div>
          <div className="min-w-0 [&_button]:w-full sm:[&_button]:w-auto">
            <CustomLineItemDialog proposalId={proposalId} currency={data.currency} onAdded={() => loadPricingData(true)} />
          </div>
          <Button
            variant="outline"
            size="default"
            onClick={() => loadPricingData(true)}
            disabled={refreshing}
            className="col-span-2 gap-2 sm:col-span-1 sm:size-9 sm:px-0"
            aria-label={refreshing ? "Refreshing pricing" : "Refresh pricing"}
            title="Refresh pricing"
          >
            <RefreshCw className={`size-4 ${refreshing ? "animate-spin text-primary" : ""}`} />
            <span className="sm:sr-only">Refresh</span>
          </Button>
        </div>
      </div>

      {!pricingValidation.success && (
        <p role="status" className="border-l-2 border-amber-500 py-2 pl-3 text-sm text-muted-foreground">
          Add at least one priced line item to complete Step 2 and unlock Step 3: Document.
        </p>
      )}

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-12 lg:gap-6">
        {/* Left Column: Service Sections & Line Items */}
        <div className="order-first min-w-0 space-y-4 lg:order-first lg:col-span-8">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold">Sections and items</h2>
            <Badge variant="secondary" className="font-normal">
              {sectionCount} {sectionCount === 1 ? "section" : "sections"}
              <span className="mx-1.5 text-muted-foreground" aria-hidden="true">/</span>
              {itemCount} {itemCount === 1 ? "item" : "items"}
            </Badge>
          </div>

          {data.proposalServices.length === 0 ? (
            <div className="rounded-xl border border-dashed bg-muted/10 px-5 py-9 text-center sm:px-6 sm:py-10">
              <div className="mx-auto mb-4 flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <PackageOpen className="size-5" aria-hidden="true" />
              </div>
              <div className="mx-auto max-w-md space-y-1">
                <h3 className="font-semibold">No pricing items yet</h3>
                <p className="text-sm text-muted-foreground">
                  Add a service package or a custom item using the actions above.
                </p>
              </div>
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleServiceDragEnd}>
              <SortableContext items={data.proposalServices.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-4">
                  {data.proposalServices.map((service, idx) => (
                    <SortableServiceSection
                      key={service.id}
                      service={service}
                      proposalId={proposalId}
                      currency={data.currency}
                      onRefresh={() => loadPricingData(true)}
                      idx={idx}
                      totalCount={data.proposalServices.length}
                      onReorderArrow={handleServiceReorderArrow}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>

        {/* Right Column: Pricing Summary Card */}
        <div className="order-last min-w-0 lg:sticky lg:top-4 lg:order-last lg:col-span-4">
          <PricingSummaryCard
            proposalId={proposalId}
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
      <ProposalWorkflowActionBar>
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          {!pricingValidation.success && (
            <p role="status" className="text-xs text-muted-foreground">
              Add at least one priced item to continue.
            </p>
          )}
          {pricingValidation.success ? (
            <Button asChild className="w-full gap-2 sm:w-auto">
              <Link href={`/dashboard/proposals/${proposalId}/composer`}>
                <FileText className="size-4" />
                <span>Continue to document</span>
              </Link>
            </Button>
          ) : (
            <Button disabled className="w-full gap-2 sm:w-auto">
              <FileText className="size-4" />
              <span>Continue to document</span>
            </Button>
          )}
        </div>
      </ProposalWorkflowActionBar>
    </div>
  );
}