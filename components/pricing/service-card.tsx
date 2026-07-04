"use client";

import { PricingApi, PricingServiceSection } from "./types";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { LineItemsTable, LineItem } from "./line-items-table";
import { deleteProposalService, updateProposalService } from "@/actions/proposal-pricing";
import { toast } from "sonner";
import { Trash2, Layers, Package, Loader2, ChevronDown, ChevronUp, Edit2, Check, X, GripVertical, ArrowUp, ArrowDown } from "lucide-react";



interface ServiceSectionCardProps {
  pricingApi: PricingApi;
  service: PricingServiceSection;
  entityId: string;
  onRefresh: () => void;
  dragHandleProps?: Record<string, unknown>;
  idx?: number;
  totalCount?: number;
  onReorderArrow?: (idx: number, dir: "up" | "down") => void;
}

export function ServiceSectionCard({ pricingApi,
  service,
  entityId,
  onRefresh,
  dragHandleProps,
  idx,
  totalCount,
  onReorderArrow,
}: ServiceSectionCardProps) {
  const [deleting, setDeleting] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(service.serviceName);
  const [editDesc, setEditDesc] = useState(service.description || "");
  const [saving, setSaving] = useState(false);

  const sectionTotal = service.items.reduce((sum, item) => sum + Number(item.total), 0);

  const handleSaveEdit = async () => {
    if (!editName.trim()) return;
    setSaving(true);
    try {
      const res = await updateProposalService(service.id, entityId, {
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
    if (!confirm(`Are you sure you want to remove the "${service.serviceName}" section? This will delete all its line items.`)) {
      return;
    }
    setDeleting(true);
    try {
      const res = await deleteProposalService(service.id, entityId);
      if (res.success) {
        toast.success(`Removed section "${service.serviceName}"`);
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
    <div className="rounded-2xl border border-border/80 bg-card/60 backdrop-blur-sm shadow-md transition-all duration-200 hover:shadow-lg overflow-hidden">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 bg-gradient-to-r from-muted/50 to-muted/20 border-b border-border/60">
        <div className="flex items-center gap-3">
          {dragHandleProps && (
            <div className="flex flex-col items-center justify-center gap-0.5 text-muted-foreground/50 hover:text-foreground">
              <button
                type="button"
                {...dragHandleProps}
                className="cursor-grab active:cursor-grabbing p-1"
                title="Drag to reorder section"
              >
                <GripVertical className="size-5" />
              </button>
              {idx !== undefined && totalCount !== undefined && onReorderArrow && (
                <div className="flex items-center gap-0.5 text-[10px] font-mono">
                  <button
                    onClick={() => onReorderArrow(idx, "up")}
                    disabled={idx === 0}
                    className="hover:text-primary disabled:opacity-20"
                    title="Move section up"
                  >
                    <ArrowUp className="size-3" />
                  </button>
                  <button
                    onClick={() => onReorderArrow(idx, "down")}
                    disabled={idx === totalCount - 1}
                    className="hover:text-primary disabled:opacity-20"
                    title="Move section down"
                  >
                    <ArrowDown className="size-3" />
                  </button>
                </div>
              )}
            </div>
          )}
          <div className="flex items-center justify-center size-10 rounded-xl bg-primary/10 text-primary shadow-inner">
            <Layers className="size-5" />
          </div>
          <div className="space-y-1 flex-1 min-w-0">
            {isEditing ? (
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 max-w-lg">
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Section Name"
                  className="h-8 text-sm font-bold bg-background"
                  disabled={saving}
                />
                <Input
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
                    disabled={saving || !editName.trim()}
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
                      setEditName(service.serviceName);
                      setEditDesc(service.description || "");
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
                  <h3 className="text-lg font-bold text-foreground tracking-tight">
                    {service.serviceName}
                  </h3>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      setEditName(service.serviceName);
                      setEditDesc(service.description || "");
                      setIsEditing(true);
                    }}
                    className="size-6 text-muted-foreground hover:text-primary transition-colors ml-1"
                    title="Edit Section Name & Description"
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
                {service.description && (
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {service.description}
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-4 w-full sm:w-auto">
          <div className="text-right">
            <div className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground flex items-center justify-end gap-1.5">
              <span>Section Total</span>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-mono">
                {service.items.length} {service.items.length === 1 ? "item" : "items"}
              </Badge>
            </div>
            <div className="text-base font-extrabold text-foreground font-mono">
              ₹{sectionTotal.toLocaleString("en-IN", { minimumFractionDigits: sectionTotal % 1 !== 0 ? 2 : 0, maximumFractionDigits: 2 })}
            </div>
          </div>

          <div className="flex items-center gap-1 pl-2 border-l border-border/60">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setCollapsed(!collapsed)}
              className="size-8 text-muted-foreground hover:text-foreground"
              title={collapsed ? "Expand section" : "Collapse section"}
            >
              {collapsed ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={handleDeleteService}
              disabled={deleting}
              className="size-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              title="Delete entire section"
            >
              {deleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Body: Line Items Table */}
      {!collapsed && (
        <div className="p-5 bg-card/30">
          <LineItemsTable pricingApi={pricingApi}
            entityId={entityId}
            serviceId={service.id}
            items={service.items}
            onRefresh={onRefresh}
          />
        </div>
      )}
    </div>
  );
}
