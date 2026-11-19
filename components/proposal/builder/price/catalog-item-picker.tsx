"use client";

import { useState } from "react";
import { toast } from "sonner";
import { addCatalogLineItemToProposal } from "@/actions/proposal-pricing";
import type { BillableCatalogItem } from "@/actions/products";
import { BillableItemAutocomplete } from "@/components/catalog/billable-item-autocomplete";
import { CustomLineItemDialog } from "./custom-line-item-dialog";
import { LoaderCircle } from "lucide-react";

export function ProposalCatalogItemPicker({
  proposalId,
  currency,
  onAdded,
}: {
  proposalId: string;
  currency: string;
  onAdded: () => void;
}) {
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);
  const [customItemOpen, setCustomItemOpen] = useState(false);

  const handleSelect = async (item: BillableCatalogItem) => {
    setAdding(true);
    try {
      const response = await addCatalogLineItemToProposal({
        proposalId,
        itemType: item.kind,
        catalogItemId: item.id,
      });
      if (!response.success) {
        toast.error(response.message || "Item could not be added");
        return;
      }
      toast.success(`${item.name} added to proposal`);
      setSearch("");
      onAdded();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Item could not be added");
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="relative min-w-0 flex-1 sm:max-w-md">
      <BillableItemAutocomplete
        value={search}
        currency={currency}
        inputId="proposal-catalog-item"
        onValueChange={setSearch}
        onSelect={(item) => void handleSelect(item)}
        onAddCustom={() => setCustomItemOpen(true)}
        disabled={adding}
      />
      <CustomLineItemDialog
        proposalId={proposalId}
        currency={currency}
        open={customItemOpen}
        onOpenChange={setCustomItemOpen}
        hideTrigger
        initialName={search}
        onAdded={() => {
          setSearch("");
          onAdded();
        }}
      />
      {adding && (
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-live="polite">
          <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
          <span className="sr-only">Adding item</span>
        </span>
      )}
    </div>
  );
}
