"use client";

import { useState, type FormEvent } from "react";
import { addCustomLineItem } from "@/actions/proposal-pricing";
import { Button } from "@/components/ui/button";
import { BillableItemType } from "@/app/generated/prisma/enums";
import {
  BillableItemTypeFields,
  getDefaultHsnSacCode,
} from "@/components/catalog/billable-item-type-fields";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
import { UnitSelect } from "@/components/catalog/measurement-units";

interface CustomLineItemDialogProps {
  proposalId: string;
  currency: string;
  onAdded: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
  initialName?: string;
}

const billingCycles = [
  { value: "ONE_TIME", label: "One-time" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "QUARTERLY", label: "Quarterly" },
  { value: "HALF_YEARLY", label: "Every six months" },
  { value: "YEARLY", label: "Annually" },
] as const;

export function CustomLineItemDialog({
  proposalId,
  currency,
  onAdded,
  open,
  onOpenChange,
  hideTrigger = false,
  initialName = "",
}: CustomLineItemDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [billingCycle, setBillingCycle] = useState<(typeof billingCycles)[number]["value"]>("ONE_TIME");
  const [unit, setUnit] = useState("Unit");
  const [itemType, setItemType] = useState<BillableItemType>(BillableItemType.SERVICE);
  const [sacCode, setSacCode] = useState(getDefaultHsnSacCode(BillableItemType.SERVICE));
  const isOpen = open ?? internalOpen;
  const handleOpenChange = (nextOpen: boolean) => {
    if (open === undefined) setInternalOpen(nextOpen);
    onOpenChange?.(nextOpen);
  };
  const currencySymbol = currency === "USD" ? "$" : "₹";

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const name = String(formData.get("name") ?? "").trim();
    if (!name) return;

    setIsSaving(true);
    try {
      const result = await addCustomLineItem({
        proposalId,
        name,
        description: String(formData.get("description") ?? "").trim() || null,
        quantity: Number(formData.get("quantity")),
        unit,
        unitPrice: Number(formData.get("unitPrice")),
        billingCycle,
        taxRate: Number(formData.get("taxRate")),
        itemType,
        sacCode: sacCode.trim() || null,
      });

      if (!result.success) {
        toast.error(result.message || "Could not add the line item.");
        return;
      }

      toast.success("Line item added to proposal");
      handleOpenChange(false);
      setBillingCycle("ONE_TIME");
      setUnit("Unit");
      setItemType(BillableItemType.SERVICE);
      setSacCode(getDefaultHsnSacCode(BillableItemType.SERVICE));
      form.reset();
      onAdded();
    } catch {
      toast.error("Could not add the line item. Try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {!hideTrigger && (
        <DialogTrigger asChild>
          <Button type="button" variant="outline" className="gap-2">
            <Plus className="size-4" />
            Add custom line item
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Add a custom line item</DialogTitle>
          <DialogDescription>
            Add a proposal-specific charge, deliverable, or adjustment that is not linked to a catalog item.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label htmlFor="custom-item-name" className="text-sm font-medium">Line item name</label>
            <Input
              key={isOpen ? `open-${initialName}` : "closed"}
              id="custom-item-name"
              name="name"
              required
              maxLength={120}
              defaultValue={initialName}
              placeholder="e.g. Implementation fee"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="custom-item-description" className="text-sm font-medium">Description <span className="text-muted-foreground">(optional)</span></label>
            <Textarea id="custom-item-description" name="description" rows={2} placeholder="Describe the scope, deliverable, or charge." />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <label htmlFor="custom-item-quantity" className="text-sm font-medium">Quantity</label>
              <Input id="custom-item-quantity" name="quantity" type="number" min={1} step={1} defaultValue={1} required />
            </div>
            <div className="space-y-2">
              <label htmlFor="custom-item-unit" className="text-sm font-medium">Unit</label>
              <UnitSelect
                id="custom-item-unit"
                value={unit}
                onValueChange={setUnit}
                showManage
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="custom-item-price" className="text-sm font-medium">Unit price ({currencySymbol})</label>
              <Input id="custom-item-price" name="unitPrice" type="number" min={0} step="0.01" defaultValue={0} required />
            </div>
          </div>

          <BillableItemTypeFields
            itemType={itemType}
            sacCode={sacCode}
            idPrefix="custom-item"
            onItemTypeChange={(nextItemType) => {
              setItemType(nextItemType);
              setSacCode(getDefaultHsnSacCode(nextItemType));
            }}
            onSacCodeChange={setSacCode}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="custom-item-cycle" className="text-sm font-medium">Billing cycle</label>
              <Select
                value={billingCycle}
                onValueChange={(value) => {
                  const cycle = billingCycles.find((option) => option.value === value);
                  if (cycle) setBillingCycle(cycle.value);
                }}
              >
                <SelectTrigger id="custom-item-cycle"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {billingCycles.map((cycle) => (
                    <SelectItem key={cycle.value} value={cycle.value}>{cycle.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label htmlFor="custom-item-tax" className="text-sm font-medium">GST / tax rate</label>
              {currency === "USD" ? (
                <>
                  <input type="hidden" name="taxRate" value="0" />
                  <p className="text-sm text-muted-foreground">Tax is set to 0% for USD proposals.</p>
                </>
              ) : (
                <Select defaultValue="18" name="taxRate">
                  <SelectTrigger id="custom-item-tax"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0%</SelectItem>
                    <SelectItem value="18">18%</SelectItem>
                    <SelectItem value="28">28%</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isSaving}>Cancel</Button>
            <Button type="submit" disabled={isSaving} className="gap-2">
              {isSaving && <Loader2 className="size-4 animate-spin" />}
              Add line item
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
