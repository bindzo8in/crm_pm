"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { LineItemsTable, LineItem } from "./line-items-table";
import { deleteProposalService, updateProposalService } from "@/actions/proposal-pricing";
import { toast } from "sonner";
import { Trash2, Package, Loader2, ChevronDown, ChevronUp, Edit2, Check, X, GripVertical, ArrowUp, ArrowDown } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export interface ProposalServiceSection {
  id: string;
  proposalId: string;
  serviceId?: string | null;
  serviceName: string;
  packageId?: string | null;
  packageName?: string | null;
  description?: string | null;
  notes?: string | null;
  items: LineItem[];
}

interface ServiceSectionCardProps {
  service: ProposalServiceSection;
  proposalId: string;
  currency: string;
  onRefresh: () => void;
  dragHandleProps?: Record<string, unknown>;
  idx?: number;
  totalCount?: number;
  onReorderArrow?: (idx: number, dir: "up" | "down") => void;
}

export function ServiceSectionCard({
  service,
  proposalId,
  currency,
  onRefresh,
  dragHandleProps,
  idx,
  totalCount,
  onReorderArrow,
}: ServiceSectionCardProps) {
  const serviceName = service.serviceName.trim() === "Custom items" ? "" : service.serviceName;
  const description =
    service.description === "Items added directly to this proposal." ? "" : service.description || "";
  const accessibleName = serviceName || "pricing section";
  const [deleting, setDeleting] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(serviceName);
  const [editDesc, setEditDesc] = useState(description);
  const [saving, setSaving] = useState(false);

  const sectionTotal = service.items.reduce((sum, item) => sum + Number(item.total), 0);
  const currencySymbol = currency === "USD" ? "$" : "₹";
  const currencyLocale = currency === "USD" ? "en-US" : "en-IN";

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      const res = await updateProposalService(service.id, proposalId, {
        serviceName: editName.trim(),
        description: editDesc.trim() || null,
      });
      if (res.success) {
        toast.success("Updated section details");
        setIsEditing(false);
        onRefresh();
      } else {
        toast.error(res.message || "Failed to update section");
      }
    } catch {
      toast.error("Error updating section");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteService = async () => {
    setDeleting(true);
    try {
      const res = await deleteProposalService(service.id, proposalId);
      if (res.success) {
        toast.success(serviceName ? `Removed section "${serviceName}"` : "Removed pricing section");
        onRefresh();
      } else {
        toast.error(res.message || "Failed to remove section");
      }
    } catch {
      toast.error("Error removing section");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="flex flex-col gap-4 border-b bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {dragHandleProps && (
            <div className="flex flex-col items-center justify-center gap-0.5 text-muted-foreground/50 hover:text-foreground">
              <button
                type="button"
                {...dragHandleProps}
                className="cursor-grab active:cursor-grabbing p-1"
                title="Drag to reorder section"
                aria-label={`Drag to reorder ${accessibleName}`}
              >
                <GripVertical className="size-5" />
              </button>
              {idx !== undefined && totalCount !== undefined && onReorderArrow && (
                <div className="flex items-center gap-0.5 text-[10px] font-mono">
                  <button
                    type="button"
                    onClick={() => onReorderArrow(idx, "up")}
                    disabled={idx === 0}
                    className="hover:text-primary disabled:opacity-20"
                    title="Move section up"
                    aria-label={`Move ${accessibleName} up`}
                  >
                    <ArrowUp className="size-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onReorderArrow(idx, "down")}
                    disabled={idx === totalCount - 1}
                    className="hover:text-primary disabled:opacity-20"
                    title="Move section down"
                    aria-label={`Move ${accessibleName} down`}
                  >
                    <ArrowDown className="size-3" />
                  </button>
                </div>
              )}
            </div>
          )}
          <div className="space-y-1 flex-1 min-w-0">
            {isEditing ? (
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 max-w-lg">
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Section title (optional)"
                  className="h-8 text-sm font-bold bg-background"
                  disabled={saving}
                />
                <Textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  placeholder="Description (optional)"
                  className="h-8 text-xs bg-background"
                  disabled={saving}
                />
                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={handleSaveEdit}
                    disabled={saving}
                    className="size-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"
                    title="Save changes"
                  >
                    {saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      setIsEditing(false);
                      setEditName(serviceName);
                      setEditDesc(description);
                    }}
                    disabled={saving}
                    className="size-8 text-muted-foreground hover:bg-muted"
                    title="Cancel"
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 flex-wrap">
                  {serviceName && (
                    <h3 className="text-base font-semibold text-foreground">
                      {serviceName}
                    </h3>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      setEditName(serviceName);
                      setEditDesc(description);
                      setIsEditing(true);
                    }}
                    className="size-7 text-muted-foreground hover:text-primary"
                    title={serviceName ? "Edit section" : "Add a section title"}
                    aria-label={serviceName ? `Edit ${serviceName}` : "Add a section title"}
                  >
                    <Edit2 className="size-3.5" />
                  </Button>
                  {service.packageName && (
                    <Badge
                      variant="secondary"
                      className="bg-primary/10 text-primary border border-primary/20 text-xs font-semibold px-2.5 py-0.5 flex items-center gap-1"
                      title="Snapshot of originally imported package"
                    >
                      <Package className="size-3" />
                      <span>{service.packageName}</span>
                    </Badge>
                  )}
                </div>
                {description && (
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {description}
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        <div className="flex w-full items-center justify-end gap-3 sm:w-auto">
          <div className="flex items-center gap-3 sm:gap-5">
            <div className="text-right">
              <div className="text-xs text-muted-foreground">
                {service.items.length} {service.items.length === 1 ? "item" : "items"}
              </div>
              <div className="font-semibold tabular-nums">
                {currencySymbol}{sectionTotal.toLocaleString(currencyLocale, { minimumFractionDigits: sectionTotal % 1 !== 0 ? 2 : 0, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 border-l pl-2">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setCollapsed(!collapsed)}
              className="size-8 text-muted-foreground hover:text-foreground"
              title={collapsed ? "Expand section" : "Collapse section"}
              aria-label={`${collapsed ? "Expand" : "Collapse"} ${accessibleName}`}
              aria-expanded={!collapsed}
              type="button"
            >
              {collapsed ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
            </Button>
            <ConfirmDialog
              trigger={
                <Button
                  size="icon"
                  variant="ghost"
                  disabled={deleting}
                  className="size-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  title="Delete entire section"
                  aria-label={`Delete ${accessibleName} and its items`}
                  type="button"
                >
                  {deleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                </Button>
              }
              title="Remove pricing section?"
              description={serviceName
                ? `Remove "${serviceName}" and all of its line items?`
                : "Remove this section and all of its line items?"}
              confirmLabel="Remove section"
              disabled={deleting}
              onConfirm={() => void handleDeleteService()}
            />
          </div>
        </div>
      </div>

      {!collapsed && (
        <div className="p-4">
          <LineItemsTable
            proposalId={proposalId}
            proposalServiceId={service.id}
            items={service.items}
            onRefresh={onRefresh}
            currency={currency}
          />
        </div>
      )}
    </div>
  );
}
