"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  updateProposalLineItem,
  deleteProposalLineItem,
  addCustomLineItem,
  reorderProposalLineItems,
} from "@/actions/proposal-pricing";
import { toast } from "sonner";
import {
  Trash2,
  Plus,
  ArrowUp,
  ArrowDown,
  Tag,
  Loader2,
  Edit2,
  Check,
  X,
  GripVertical,
} from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";

export interface LineItem {
  id: string;
  proposalServiceId: string;
  packageItemId?: string | null;
  name: string;
  description?: string | null;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
  billingCycle: "ONE_TIME" | "MONTHLY" | "QUARTERLY" | "HALF_YEARLY" | "YEARLY";
  sortOrder: number;
  isCustom: boolean;
  discountType?: string | null;
  discountValue?: number | null;
  taxRate?: number;
}

interface LineItemsTableProps {
  proposalId: string;
  proposalServiceId: string;
  items: LineItem[];
  onRefresh: () => void;
  currency?: string;
}

const billingCycleLabels: Record<string, string> = {
  ONE_TIME: "One Time",
  MONTHLY: "Monthly",
  QUARTERLY: "Quarterly",
  HALF_YEARLY: "Half-Yearly",
  YEARLY: "Yearly",
};

const taxOptions = [0, 18, 28];

interface SortableRowProps {
  item: LineItem;
  currencySymbol: string;
  currencyLocale: string;
  idx: number;
  totalItems: number;
  isEditing: boolean;
  isLoading: boolean;
  editForm: Partial<LineItem>;
  setEditForm: (form: Partial<LineItem>) => void;
  onSave: (id: string) => void;
  onCancel: () => void;
  onStartEdit: (item: LineItem) => void;
  onDelete: (item: LineItem) => void;
  onReorderArrow: (index: number, dir: "up" | "down") => void;
}

function SortableRow({
  item,
  currencySymbol,
  currencyLocale,
  idx,
  totalItems,
  isEditing,
  isLoading,
  editForm,
  setEditForm,
  onSave,
  onCancel,
  onStartEdit,
  onDelete,
  onReorderArrow,
}: SortableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id, disabled: isEditing || isLoading });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const quantity = Number(editForm.quantity) || 0;
  const price = Number(editForm.unitPrice) || 0;
  const base = quantity * price;
  const discount = editForm.discountType === "PERCENTAGE"
    ? base * ((Number(editForm.discountValue) || 0) / 100)
    : editForm.discountType === "FIXED"
      ? Number(editForm.discountValue) || 0
      : 0;
  const taxable = Math.max(0, base - discount);
  const tax = taxable * ((Number(editForm.taxRate) || 0) / 100);
  const previewTotal = `${currencySymbol}${Math.round(taxable + tax).toLocaleString(currencyLocale)}`;

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={`min-w-0 rounded-lg border bg-background ${isEditing ? "border-primary/40 bg-primary/[0.03]" : ""}`}
    >
      <header className="flex min-w-0 items-start gap-2.5 px-3 py-3 sm:gap-3 sm:px-4">
        <div className="flex shrink-0 items-center gap-1 pt-0.5">
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="touch-none cursor-grab rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing"
            title="Drag to reorder"
            aria-label={`Drag to reorder ${item.name}`}
            disabled={isLoading || isEditing}
          >
            <GripVertical className="size-4" aria-hidden="true" />
          </button>
          <span className="w-5 text-center text-xs tabular-nums text-muted-foreground">
            {idx + 1}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          {isEditing ? (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label htmlFor={`line-item-name-${item.id}`} className="text-xs font-medium text-muted-foreground">Item name</label>
                <Input
                  id={`line-item-name-${item.id}`}
                  value={editForm.name || ""}
                  onChange={(event) => setEditForm({ ...editForm, name: event.target.value })}
                  placeholder="Item name"
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor={`line-item-description-${item.id}`} className="text-xs font-medium text-muted-foreground">Description</label>
                <Textarea
                  id={`line-item-description-${item.id}`}
                  value={editForm.description || ""}
                  onChange={(event) => setEditForm({ ...editForm, description: event.target.value })}
                  placeholder="Add a short description (optional)"
                  className="min-h-16"
                />
              </div>

              <div className="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="min-w-0 space-y-1.5">
                  <label htmlFor={`line-item-quantity-${item.id}`} className="text-xs font-medium text-muted-foreground">Quantity</label>
                  <Input
                    id={`line-item-quantity-${item.id}`}
                    type="number"
                    min={1}
                    value={editForm.quantity ?? 1}
                    onChange={(event) => setEditForm({ ...editForm, quantity: Number(event.target.value) })}
                  />
                </div>
                <div className="min-w-0 space-y-1.5">
                  <label htmlFor={`line-item-unit-${item.id}`} className="text-xs font-medium text-muted-foreground">Unit</label>
                  <Input
                    id={`line-item-unit-${item.id}`}
                    value={editForm.unit || ""}
                    onChange={(event) => setEditForm({ ...editForm, unit: event.target.value })}
                    placeholder="Unit"
                  />
                </div>
                <div className="col-span-2 min-w-0 space-y-1.5 sm:col-span-1">
                  <label htmlFor={`line-item-price-${item.id}`} className="text-xs font-medium text-muted-foreground">Unit price ({currencySymbol})</label>
                  <Input
                    id={`line-item-price-${item.id}`}
                    type="number"
                    min={0}
                    step="0.01"
                    value={editForm.unitPrice ?? 0}
                    onChange={(event) => setEditForm({ ...editForm, unitPrice: Number(event.target.value) })}
                  />
                </div>
              </div>

              <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="min-w-0 space-y-1.5">
                  <label htmlFor={`line-item-cycle-${item.id}`} className="text-xs font-medium text-muted-foreground">Billing cycle</label>
                  <Select
                    value={editForm.billingCycle || "ONE_TIME"}
                    onValueChange={(value) => setEditForm({ ...editForm, billingCycle: value as LineItem["billingCycle"] })}
                  >
                    <SelectTrigger id={`line-item-cycle-${item.id}`} className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(billingCycleLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="min-w-0 space-y-1.5">
                  <label htmlFor={`line-item-discount-${item.id}`} className="text-xs font-medium text-muted-foreground">Discount</label>
                  <Select
                    value={editForm.discountType || "NONE"}
                    onValueChange={(value) => setEditForm({ ...editForm, discountType: value })}
                  >
                    <SelectTrigger id={`line-item-discount-${item.id}`} className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">No discount</SelectItem>
                      <SelectItem value="PERCENTAGE">Percentage off</SelectItem>
                      <SelectItem value="FIXED">{currencySymbol} amount off</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {editForm.discountType && editForm.discountType !== "NONE" && (
                <div className="max-w-full space-y-1.5 sm:max-w-[calc(50%-0.375rem)]">
                  <label htmlFor={`line-item-discount-value-${item.id}`} className="text-xs font-medium text-muted-foreground">
                    {editForm.discountType === "PERCENTAGE" ? "Discount (%)" : `Discount (${currencySymbol})`}
                  </label>
                  <Input
                    id={`line-item-discount-value-${item.id}`}
                    type="number"
                    min={0}
                    step="0.01"
                    value={editForm.discountValue ?? 0}
                    onChange={(event) => setEditForm({ ...editForm, discountValue: Number(event.target.value) })}
                  />
                </div>
              )}

              <fieldset className="space-y-2">
                <legend className="text-xs font-medium text-muted-foreground">Tax rate</legend>
                <div className="flex flex-wrap gap-2">
                  {taxOptions.map((rate) => {
                    const selected = (editForm.taxRate ?? 0) === rate;
                    return (
                      <button
                        key={rate}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => setEditForm({ ...editForm, taxRate: rate })}
                        className={`min-h-9 min-w-14 rounded-md border px-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                          selected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "bg-background text-muted-foreground hover:border-primary/50"
                        }`}
                      >
                        {rate}%
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <div className="flex min-w-0 flex-col gap-3 border-t pt-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  Item total <span className="ml-1 font-semibold tabular-nums text-foreground">{previewTotal}</span>
                </p>
                <div className="flex w-full items-center gap-2 sm:w-auto">
                  <Button variant="outline" size="sm" onClick={onCancel} disabled={isLoading}>
                    <X className="size-4" />
                    Cancel
                  </Button>
                  <Button className="min-w-0 flex-1 sm:flex-none" size="sm" onClick={() => onSave(item.id)} disabled={isLoading || !editForm.name?.trim()}>
                    {isLoading ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                    <span className="sm:hidden">Save</span>
                    <span className="hidden sm:inline">Save changes</span>
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                <h4 className="min-w-0 break-words font-medium text-foreground">{item.name}</h4>
                <Badge
                  variant={item.isCustom ? "outline" : "secondary"}
                  className={`shrink-0 text-[10px] font-medium ${
                    item.isCustom
                      ? "border-violet-500/30 bg-violet-500/5 text-violet-600 dark:text-violet-400"
                      : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                  }`}
                >
                  {item.isCustom ? "Custom" : "From package"}
                </Badge>
              </div>
              {item.description && (
                <p className="mt-1 break-words text-sm text-muted-foreground">{item.description}</p>
              )}
              <p className="mt-1 text-xs text-muted-foreground">
                {item.quantity} {item.unit || "unit"} · {billingCycleLabels[item.billingCycle] || item.billingCycle}
              </p>
            </>
          )}
        </div>

        <div className="flex shrink-0 items-start gap-0.5">
          {!isEditing && (
            <>
              <Button
                size="icon"
                variant="ghost"
                className="size-8 text-muted-foreground hover:text-foreground"
                onClick={() => onStartEdit(item)}
                disabled={isLoading}
                title="Edit item"
                aria-label={`Edit ${item.name}`}
              >
                <Edit2 className="size-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="size-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                onClick={() => onDelete(item)}
                disabled={isLoading}
                title="Delete item"
                aria-label={`Delete ${item.name}`}
              >
                {isLoading ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
              </Button>
            </>
          )}
        </div>
      </header>

      {!isEditing && (
        <div className="grid grid-cols-2 gap-x-3 gap-y-3 border-t bg-muted/15 px-3 py-3 sm:grid-cols-4 sm:px-4 lg:grid-cols-4">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Unit price</p>
            <p className="mt-0.5 break-words text-sm tabular-nums">
              {currencySymbol}{item.unitPrice.toLocaleString(currencyLocale, { minimumFractionDigits: item.unitPrice % 1 !== 0 ? 2 : 0, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Discount</p>
            <p className="mt-0.5 text-sm">
              {item.discountValue && item.discountValue > 0
                ? item.discountType === "PERCENTAGE"
                  ? `${item.discountValue}% off`
                  : `${currencySymbol}${item.discountValue} off`
                : "—"}
            </p>
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Tax</p>
            <p className="mt-0.5 text-sm">{item.taxRate ?? 0}% GST</p>
          </div>
          <div className="min-w-0 text-right">
            <p className="text-xs text-muted-foreground">Item total</p>
            <p className="mt-0.5 break-words text-sm font-semibold tabular-nums text-foreground">
              {currencySymbol}{item.total.toLocaleString(currencyLocale, { minimumFractionDigits: item.total % 1 !== 0 ? 2 : 0, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      )}

      {!isEditing && totalItems > 1 && (
        <footer className="flex items-center justify-end gap-1 border-t px-3 py-1.5 sm:px-4">
          <span className="mr-auto text-xs text-muted-foreground">Reorder item</span>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-8"
            onClick={() => onReorderArrow(idx, "up")}
            disabled={idx === 0 || isLoading}
            title="Move up"
            aria-label={`Move ${item.name} up`}
          >
            <ArrowUp className="size-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-8"
            onClick={() => onReorderArrow(idx, "down")}
            disabled={idx === totalItems - 1 || isLoading}
            title="Move down"
            aria-label={`Move ${item.name} down`}
          >
            <ArrowDown className="size-4" />
          </Button>
        </footer>
      )}
    </article>
  );
}

export function LineItemsTable({
  proposalId,
  proposalServiceId,
  items,
  onRefresh,
  currency = "INR",
}: LineItemsTableProps) {
  const currencySymbol = currency === "USD" ? "$" : "₹";
  const currencyLocale = currency === "USD" ? "en-US" : "en-IN";
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<LineItem>>({});
  const [loadingActionId, setLoadingActionId] = useState<string | null>(null);

  // Custom item dialog state
  const [customModalOpen, setCustomModalOpen] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customDescription, setCustomDescription] = useState("");
  const [customQty, setCustomQty] = useState<number>(1);
  const [customUnit, setCustomUnit] = useState<string>("Unit");
  const [customUnitPrice, setCustomUnitPrice] = useState<number>(0);
  const [customCycle, setCustomCycle] = useState<string>("ONE_TIME");
  const [customDiscountType, setCustomDiscountType] = useState<string>("NONE");
  const [customDiscountVal, setCustomDiscountVal] = useState<number>(0);
  const [customTaxRate, setCustomTaxRate] = useState<number>(18);
  const [addingCustom, setAddingCustom] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleStartEdit = (item: LineItem) => {
    setEditingItemId(item.id);
    setEditForm({
      name: item.name,
      description: item.description || "",
      quantity: item.quantity,
      unit: item.unit || "Unit",
      unitPrice: item.unitPrice,
      billingCycle: item.billingCycle,
      discountType: item.discountType || "NONE",
      discountValue: item.discountValue || 0,
      taxRate: item.taxRate ?? 18,
    });
  };

  const handleCancelEdit = () => {
    setEditingItemId(null);
    setEditForm({});
  };

  const handleSaveEdit = async (itemId: string) => {
    if (!editForm.name) {
      toast.error("Item name cannot be empty");
      return;
    }
    setLoadingActionId(itemId);
    try {
      const discType = editForm.discountType === "NONE" || !editForm.discountType ? null : editForm.discountType;
      const discVal = discType ? Number(editForm.discountValue || 0) : null;

      const res = await updateProposalLineItem({
        id: itemId,
        proposalId,
        name: editForm.name,
        description: editForm.description || null,
        quantity: Number(editForm.quantity) || 1,
        unit: editForm.unit || "Unit",
        unitPrice: Number(editForm.unitPrice) || 0,
        billingCycle: (editForm.billingCycle as "ONE_TIME" | "MONTHLY" | "QUARTERLY" | "HALF_YEARLY" | "YEARLY") || "ONE_TIME",
        discountType: discType as "PERCENTAGE" | "FIXED" | null,
        discountValue: discVal,
        taxRate: Number(editForm.taxRate ?? 18),
      });

      if (res.success) {
        toast.success("Item updated & totals synced");
        setEditingItemId(null);
        onRefresh();
      } else {
        toast.error(res.message || "Failed to update item");
      }
    } catch {
      toast.error("An error occurred while saving");
    } finally {
      setLoadingActionId(null);
    }
  };

  const handleDeleteItem = async (item: LineItem) => {
    setLoadingActionId(item.id);
    try {
      const res = await deleteProposalLineItem(item.id, proposalId);
      if (res.success) {
        toast.success(`Removed "${item.name}" from proposal`);
        onRefresh();
      } else {
        toast.error(res.message || "Failed to delete item");
      }
    } catch {
      toast.error("An error occurred while deleting");
    } finally {
      setLoadingActionId(null);
    }
  };

  const handleReorderArrow = async (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;

    const currentItem = items[index];
    const targetItem = items[targetIndex];

    const newItemsOrder = [
      { id: currentItem.id, sortOrder: targetItem.sortOrder },
      { id: targetItem.id, sortOrder: currentItem.sortOrder },
    ];

    try {
      const res = await reorderProposalLineItems(proposalId, newItemsOrder);
      if (res.success) {
        onRefresh();
      } else {
        toast.error("Failed to reorder items");
      }
    } catch {
      toast.error("Reorder error");
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((i) => i.id === active.id);
      const newIndex = items.findIndex((i) => i.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        const newItems = arrayMove(items, oldIndex, newIndex);
        const reorderedPayload = newItems.map((it, idx) => ({
          id: it.id,
          sortOrder: idx,
        }));
        try {
          const res = await reorderProposalLineItems(proposalId, reorderedPayload);
          if (res.success) {
            onRefresh();
          } else {
            toast.error("Failed to reorder items");
          }
        } catch {
          toast.error("Reorder error");
        }
      }
    }
  };

  const handleAddCustomItem = async () => {
    if (!customName.trim()) {
      toast.error("Please enter a custom item name");
      return;
    }
    setAddingCustom(true);
    try {
      const discType = customDiscountType === "NONE" ? null : customDiscountType;
      const discVal = discType ? Number(customDiscountVal || 0) : null;

      const res = await addCustomLineItem({
        proposalServiceId,
        proposalId,
        name: customName.trim(),
        description: customDescription.trim() || null,
        quantity: Number(customQty) || 1,
        unit: customUnit.trim() || "Unit",
        unitPrice: Number(customUnitPrice) || 0,
        billingCycle: customCycle as "ONE_TIME" | "MONTHLY" | "QUARTERLY" | "HALF_YEARLY" | "YEARLY",
        discountType: discType as "PERCENTAGE" | "FIXED" | null,
        discountValue: discVal,
        taxRate: Number(customTaxRate ?? 18),
      });

      if (res.success) {
        toast.success("Custom item added!");
        setCustomModalOpen(false);
        setCustomName("");
        setCustomDescription("");
        setCustomQty(1);
        setCustomUnit("Unit");
        setCustomUnitPrice(0);
        setCustomCycle("ONE_TIME");
        setCustomDiscountType("NONE");
        setCustomDiscountVal(0);
        setCustomTaxRate(18);
        onRefresh();
      } else {
        toast.error(res.message || "Failed to add custom item");
      }
    } catch {
      toast.error("Error adding custom item");
    } finally {
      setAddingCustom(false);
    }
  };

  const presetSuggestions = ["Training", "Migration", "API Integration", "24/7 Support", "SEO Setup"];

  return (
    <div className="min-w-0 space-y-4">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        {items.length === 0 ? (
          <div className="rounded-lg border border-dashed px-4 py-6 text-center">
            <p className="text-sm font-medium">No items in this section yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Add a custom item or import a package to get started.
            </p>
          </div>
        ) : (
          <SortableContext items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
            <div className="min-w-0 space-y-3">
              {items.map((item, idx) => (
                <SortableRow
                  key={item.id}
                  item={item}
                  currencySymbol={currencySymbol}
                  currencyLocale={currencyLocale}
                  idx={idx}
                  totalItems={items.length}
                  isEditing={editingItemId === item.id}
                  isLoading={loadingActionId === item.id}
                  editForm={editForm}
                  setEditForm={setEditForm}
                  onSave={handleSaveEdit}
                  onCancel={handleCancelEdit}
                  onStartEdit={handleStartEdit}
                  onDelete={handleDeleteItem}
                  onReorderArrow={handleReorderArrow}
                />
              ))}
            </div>
          </SortableContext>
        )}
      </DndContext>

      {/* Add Custom Item Modal / Trigger */}
      <div className="flex justify-start">
        <Dialog open={customModalOpen} onOpenChange={setCustomModalOpen}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 border-dashed border-primary/40 text-primary hover:bg-primary/5 hover:border-primary font-medium"
            >
              <Plus className="size-4" />
              <span>Add Custom Item</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Tag className="size-5 text-violet-500" />
                <span>Add Custom Line Item</span>
              </DialogTitle>
              <DialogDescription className="text-xs">
                Custom items are specific to this proposal (e.g., Training, Migration, API Integration).
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 my-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Quick Suggestions</label>
                <div className="flex flex-wrap gap-1.5">
                  {presetSuggestions.map((preset) => (
                    <Badge
                      key={preset}
                      variant="secondary"
                      className="cursor-pointer hover:bg-primary hover:text-primary-foreground text-xs transition-colors"
                      onClick={() => setCustomName(preset)}
                    >
                      + {preset}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium">Item Name *</label>
                <Input
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="e.g. Custom API Integration"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium">Description (optional)</label>
                <Input
                  value={customDescription}
                  onChange={(e) => setCustomDescription(e.target.value)}
                  placeholder="Details of the scope or deliverable..."
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium">Quantity *</label>
                  <Input
                    type="number"
                    min={1}
                    value={customQty}
                    onChange={(e) => setCustomQty(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">Unit *</label>
                  <Input
                    value={customUnit}
                    onChange={(e) => setCustomUnit(e.target.value)}
                    placeholder="e.g. Hrs, Days, Unit"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">Unit Price ({currencySymbol}) *</label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={customUnitPrice}
                    onChange={(e) => setCustomUnitPrice(Number(e.target.value))}
                  />
                </div>
              </div>

              {/* Discount Section */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                <div className="space-y-1">
                  <label className="text-xs font-medium">Discount Type</label>
                  <Select value={customDiscountType} onValueChange={setCustomDiscountType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">No Discount</SelectItem>
                      <SelectItem value="PERCENTAGE">Percentage (%) Off</SelectItem>
                      <SelectItem value="FIXED">Amount ({currencySymbol}) Off</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {customDiscountType !== "NONE" && (
                  <div className="space-y-1">
                    <label className="text-xs font-medium">
                      {customDiscountType === "PERCENTAGE" ? "Discount (%)" : `Discount (${currencySymbol})`}
                    </label>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={customDiscountVal}
                      onChange={(e) => setCustomDiscountVal(Number(e.target.value))}
                      placeholder="0"
                    />
                  </div>
                )}
              </div>

              {/* Tax Rate Selection - Quick Options Only */}
              <div className="space-y-2 pt-2 border-t">
                <label className="text-xs font-medium flex items-center justify-between">
                  <span>Tax / GST Rate *</span>
                  <span className="text-[11px] text-muted-foreground font-normal">Quick Selection Only</span>
                </label>
                <div className="flex gap-2">
                  {taxOptions.map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => setCustomTaxRate(rate)}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${
                        customTaxRate === rate
                          ? "bg-primary text-primary-foreground border-primary shadow-sm scale-[1.02]"
                          : "bg-muted/50 text-muted-foreground border-border hover:border-primary/40"
                      }`}
                    >
                      {rate}%
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1 pt-2 border-t">
                <label className="text-xs font-medium">Billing Cycle</label>
                <Select value={customCycle} onValueChange={setCustomCycle}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(billingCycleLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <Button variant="outline" size="sm" onClick={() => setCustomModalOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleAddCustomItem} disabled={addingCustom} className="gap-1.5">
                {addingCustom && <Loader2 className="size-3.5 animate-spin" />}
                <span>Add Item</span>
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
