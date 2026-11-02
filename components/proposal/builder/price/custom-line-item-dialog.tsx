"use client";

import { useState, type FormEvent } from "react";
import { addCustomLineItem } from "@/actions/proposal-pricing";
import { Button } from "@/components/ui/button";
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

interface CustomLineItemDialogProps {
  proposalId: string;
  currency: string;
  onAdded: () => void;
}

const billingCycles = [
  { value: "ONE_TIME", label: "One time" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "QUARTERLY", label: "Quarterly" },
  { value: "HALF_YEARLY", label: "Half-yearly" },
  { value: "YEARLY", label: "Yearly" },
] as const;

export function CustomLineItemDialog({ proposalId, currency, onAdded }: CustomLineItemDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [billingCycle, setBillingCycle] = useState<(typeof billingCycles)[number]["value"]>("ONE_TIME");
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
        unit: String(formData.get("unit") ?? "").trim() || "Unit",
        unitPrice: Number(formData.get("unitPrice")),
        billingCycle,
        taxRate: Number(formData.get("taxRate")),
      });

      if (!result.success) {
        toast.error(result.message || "Could not add the custom item.");
        return;
      }

      toast.success("Custom item added");
      setOpen(false);
      setBillingCycle("ONE_TIME");
      form.reset();
      onAdded();
    } catch {
      toast.error("Could not add the custom item. Try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" className="gap-2">
          <Plus className="size-4" />
          Add custom item
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Add an item without a service</DialogTitle>
          <DialogDescription>
            Add a one-off charge or deliverable directly to this proposal.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label htmlFor="custom-item-name" className="text-sm font-medium">Item name</label>
            <Input id="custom-item-name" name="name" required maxLength={120} placeholder="e.g. On-site training" />
          </div>

          <div className="space-y-2">
            <label htmlFor="custom-item-description" className="text-sm font-medium">Description <span className="text-muted-foreground">(optional)</span></label>
            <Textarea id="custom-item-description" name="description" rows={2} placeholder="Describe the work or deliverable." />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <label htmlFor="custom-item-quantity" className="text-sm font-medium">Quantity</label>
              <Input id="custom-item-quantity" name="quantity" type="number" min={1} step={1} defaultValue={1} required />
            </div>
            <div className="space-y-2">
              <label htmlFor="custom-item-unit" className="text-sm font-medium">Unit</label>
              <Input id="custom-item-unit" name="unit" maxLength={30} defaultValue="Unit" placeholder="Hours, days, unit" />
            </div>
            <div className="space-y-2">
              <label htmlFor="custom-item-price" className="text-sm font-medium">Unit price ({currencySymbol})</label>
              <Input id="custom-item-price" name="unitPrice" type="number" min={0} step="0.01" defaultValue={0} required />
            </div>
          </div>

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
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSaving}>Cancel</Button>
            <Button type="submit" disabled={isSaving} className="gap-2">
              {isSaving && <Loader2 className="size-4 animate-spin" />}
              Add item to proposal
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
