"use client";

import { PricingApi } from "./types";
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

export interface LineItem {
  id: string;
  serviceId: string;
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
  pricingApi: PricingApi;
  entityId: string;
  serviceId: string;
  items: LineItem[];
  onRefresh: () => void;
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

  if (isEditing) {
    return (
      <tr ref={setNodeRef} style={style} className="bg-primary/5 transition-colors">
        <td className="py-3 px-2 text-center text-muted-foreground font-mono text-xs">
          {idx + 1}
        </td>
        <td className="py-3 px-2 space-y-2">
          <Input
            value={editForm.name || ""}
            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
            placeholder="Item Name"
            className="h-8 font-medium text-xs"
          />
          <Input
            value={editForm.description || ""}
            onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
            placeholder="Description (optional)"
            className="h-8 text-[11px] text-muted-foreground"
          />
        </td>
        <td className="py-3 px-2 text-center">
          <Select
            value={editForm.billingCycle || "ONE_TIME"}
            onValueChange={(val) => setEditForm({ ...editForm, billingCycle: val as LineItem["billingCycle"] })}
          >
            <SelectTrigger className="h-8 text-[11px] w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(billingCycleLabels).map(([key, label]) => (
                <SelectItem key={key} value={key} className="text-xs">
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </td>
        <td className="py-3 px-2 text-right">
          <div className="flex items-center justify-end gap-1">
            <Input
              type="number"
              min={1}
              value={editForm.quantity ?? 1}
              onChange={(e) => setEditForm({ ...editForm, quantity: Number(e.target.value) })}
              className="h-8 w-14 text-right text-xs"
              title="Quantity"
            />
            <Input
              value={editForm.unit || ""}
              onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })}
              placeholder="Unit"
              className="h-8 w-14 text-xs"
              title="Unit (e.g. Hrs, Days, Unit)"
            />
          </div>
        </td>
        <td className="py-3 px-2 text-right">
          <Input
            type="number"
            min={0}
            step="0.01"
            value={editForm.unitPrice ?? 0}
            onChange={(e) => setEditForm({ ...editForm, unitPrice: Number(e.target.value) })}
            className="h-8 w-24 text-right ml-auto text-xs font-mono"
          />
        </td>
        <td className="py-3 px-2 text-center space-y-1">
          <Select
            value={editForm.discountType || "NONE"}
            onValueChange={(val) => setEditForm({ ...editForm, discountType: val })}
          >
            <SelectTrigger className="h-7 text-[11px]">
              <SelectValue placeholder="Discount" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NONE" className="text-xs">No Disc.</SelectItem>
              <SelectItem value="PERCENTAGE" className="text-xs">% Off</SelectItem>
              <SelectItem value="FIXED" className="text-xs">₹ Off</SelectItem>
            </SelectContent>
          </Select>
          {editForm.discountType && editForm.discountType !== "NONE" && (
            <Input
              type="number"
              min={0}
              step="0.01"
              value={editForm.discountValue ?? 0}
              onChange={(e) => setEditForm({ ...editForm, discountValue: Number(e.target.value) })}
              placeholder="Value"
              className="h-7 w-20 mx-auto text-center text-xs font-mono"
            />
          )}
        </td>
        <td className="py-3 px-2 text-center">
          <div className="flex flex-wrap gap-1 justify-center max-w-[120px] mx-auto">
            {taxOptions.map((rate) => (
              <button
                key={rate}
                type="button"
                onClick={() => setEditForm({ ...editForm, taxRate: rate })}
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                  (editForm.taxRate ?? 0) === rate
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-muted-foreground border-border hover:border-primary/50"
                }`}
              >
                {rate}%
              </button>
            ))}
          </div>
        </td>
        <td className="py-3 px-2 text-right font-semibold text-primary text-xs font-mono">
          {(() => {
            const qty = Number(editForm.quantity) || 0;
            const price = Number(editForm.unitPrice) || 0;
            const base = qty * price;
            let disc = 0;
            if (editForm.discountType === "PERCENTAGE") disc = base * ((Number(editForm.discountValue) || 0) / 100);
            else if (editForm.discountType === "FIXED") disc = Number(editForm.discountValue) || 0;
            const taxable = Math.max(0, base - disc);
            const tax = taxable * ((Number(editForm.taxRate) || 0) / 100);
            return `₹${Math.round(taxable + tax).toLocaleString()}`;
          })()}
        </td>
        <td className="py-3 px-2 text-right">
          <div className="flex items-center justify-end gap-1">
            <Button
              size="icon"
              variant="ghost"
              className="size-7 text-green-600 hover:text-green-700 hover:bg-green-500/10"
              onClick={() => onSave(item.id)}
              disabled={isLoading}
              title="Save changes"
            >
              {isLoading ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="size-7 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              onClick={onCancel}
              disabled={isLoading}
              title="Cancel"
            >
              <X className="size-3.5" />
            </Button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr ref={setNodeRef} style={style} className="hover:bg-muted/30 transition-colors group">
      <td className="py-3 px-3 text-center text-muted-foreground font-mono text-xs">
        <div className="flex items-center justify-center gap-1">
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-foreground p-0.5"
            title="Drag to reorder"
            disabled={isLoading}
          >
            <GripVertical className="size-4" />
          </button>
          <div className="flex flex-col items-center gap-0.5">
            <button
              onClick={() => onReorderArrow(idx, "up")}
              disabled={idx === 0 || isLoading}
              className="text-muted-foreground/40 hover:text-foreground disabled:opacity-20"
              title="Move up"
            >
              <ArrowUp className="size-3" />
            </button>
            <span>{idx + 1}</span>
            <button
              onClick={() => onReorderArrow(idx, "down")}
              disabled={idx === totalItems - 1 || isLoading}
              className="text-muted-foreground/40 hover:text-foreground disabled:opacity-20"
              title="Move down"
            >
              <ArrowDown className="size-3" />
            </button>
          </div>
        </div>
      </td>
      <td className="py-3 px-3">
        <div className="font-medium text-foreground">{item.name}</div>
        {item.description && (
          <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
            {item.description}
          </div>
        )}
      </td>
      <td className="py-3 px-3 text-center">
        <Badge
          variant={item.isCustom ? "outline" : "secondary"}
          className={`text-[10px] font-semibold px-2 py-0.5 ${
            item.isCustom
              ? "border-violet-500/30 text-violet-600 dark:text-violet-400 bg-violet-500/5"
              : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
          }`}
        >
          {item.isCustom ? "Custom Item" : "Snapshot"}
        </Badge>
      </td>
      <td className="py-3 px-3 text-right">
        <div className="font-medium">{item.quantity} {item.unit || ""}</div>
        <div className="text-[10px] text-muted-foreground">
          {billingCycleLabels[item.billingCycle] || item.billingCycle}
        </div>
      </td>
      <td className="py-3 px-3 text-right text-muted-foreground font-mono text-xs">
        ₹{item.unitPrice.toLocaleString("en-IN", { minimumFractionDigits: item.unitPrice % 1 !== 0 ? 2 : 0, maximumFractionDigits: 2 })}
      </td>
      <td className="py-3 px-3 text-center">
        {item.discountValue && item.discountValue > 0 ? (
          <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-mono">
            {item.discountType === "PERCENTAGE" ? `-${item.discountValue}%` : `-₹${item.discountValue}`}
          </Badge>
        ) : (
          <span className="text-muted-foreground/50 text-xs">-</span>
        )}
      </td>
      <td className="py-3 px-3 text-center">
        <Badge
          variant="secondary"
          className={`text-[10px] font-mono px-2 py-0.5 ${
            (item.taxRate ?? 0) > 0
              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {item.taxRate ?? 0}% GST
        </Badge>
      </td>
      <td className="py-3 px-3 text-right font-bold text-foreground font-mono">
        ₹{item.total.toLocaleString("en-IN", { minimumFractionDigits: item.total % 1 !== 0 ? 2 : 0, maximumFractionDigits: 2 })}
      </td>
      <td className="py-3 px-3 text-right">
        <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
          <Button
            size="icon"
            variant="ghost"
            className="size-8 text-muted-foreground hover:text-foreground"
            onClick={() => onStartEdit(item)}
            disabled={isLoading}
            title="Edit Line Item (Tax, Discount & Pricing)"
          >
            <Edit2 className="size-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="size-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            onClick={() => onDelete(item)}
            disabled={isLoading}
            title="Delete Line Item (Never modifies package)"
          >
            {isLoading ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
          </Button>
        </div>
      </td>
    </tr>
  );
}

export function LineItemsTable({ pricingApi,
  entityId,
  serviceId,
  items,
  onRefresh,
}: LineItemsTableProps) {
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

      const res = await pricingApi.updateLineItem(itemId, {
        id: itemId,
        entityId,
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
      const res = await pricingApi.deleteLineItem(item.id);
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
      const res = await reorderProposalLineItems(entityId, newItemsOrder);
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
          const res = await reorderProposalLineItems(entityId, reorderedPayload);
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

      const res = await pricingApi.createCustomItem(entityId, {
        serviceId,
        entityId,
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
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-xl border border-border/60 bg-background/50 shadow-sm">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b bg-muted/40 text-muted-foreground font-semibold text-xs uppercase tracking-wider">
                <th className="py-3 px-3 w-16 text-center">#</th>
                <th className="py-3 px-3 min-w-[200px]">Item Details</th>
                <th className="py-3 px-3 w-24 text-center">Type</th>
                <th className="py-3 px-3 w-32 text-right">Qty & Unit</th>
                <th className="py-3 px-3 w-28 text-right">Unit Price</th>
                <th className="py-3 px-3 w-28 text-center">Discount</th>
                <th className="py-3 px-3 w-32 text-center">Tax / GST</th>
                <th className="py-3 px-3 w-32 text-right">Total (₹)</th>
                <th className="py-3 px-3 w-24 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-muted-foreground italic text-sm">
                    No line items in this section. Add a custom item or import a package.
                  </td>
                </tr>
              ) : (
                <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                  {items.map((item, idx) => (
                    <SortableRow
                      key={item.id}
                      item={item}
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
                </SortableContext>
              )}
            </tbody>
          </table>
        </DndContext>
      </div>

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
                  <label className="text-xs font-medium">Unit Price (₹) *</label>
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
                      <SelectItem value="FIXED">Amount (₹) Off</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {customDiscountType !== "NONE" && (
                  <div className="space-y-1">
                    <label className="text-xs font-medium">
                      {customDiscountType === "PERCENTAGE" ? "Discount (%)" : "Discount (₹)"}
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
