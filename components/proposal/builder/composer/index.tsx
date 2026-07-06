"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Loader2,
  ArrowLeft,
  RefreshCw,
  DollarSign,
  HelpCircle,
  Eye,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
} from "@dnd-kit/sortable";

import {
  getProposalComposerData,
  createProposalBlock,
  updateProposalBlock,
  reorderProposalBlocks,
  duplicateProposalBlock,
  deleteProposalBlock,
  toggleBlockVisibility,
} from "@/actions/proposal-composer";

import { AddBlockMenu } from "./add-block-menu";
import { SortableBlockWrapper } from "./sortable-block-wrapper";
import { CoverBlockEditor } from "./cover-block-editor";
import { PricingBlockViewer } from "./pricing-block-viewer";
import { RichTextBlockEditor } from "./rich-text-block-editor";
import { TimelineBlockEditor } from "./timeline-block-editor";
import { SignatureBlockEditor } from "./signature-block-editor";
import { ProposalBlockType } from "@/app/generated/prisma/client";

interface ProposalData {
  id: string;
  title: string;
  customerDisplayName?: string;
  customer?: { displayName: string; companyName?: string | null };
  subtotal: number;
  discount: number;
  tax: number;
  roundOff: number;
  grandTotal: number;
  proposalServices?: Array<{
    id: string;
    serviceName: string;
    packageName?: string | null;
    items: Array<{
      id: string;
      name: string;
      description?: string | null;
      quantity: number;
      unit: string;
      unitPrice: number;
      total: number;
      billingCycle: string;
    }>;
  }>;
}

interface BlockItem {
  id: string;
  type: ProposalBlockType | string;
  title?: string | null;
  sortOrder: number;
  isVisible: boolean;
  isLocked: boolean;
  isSystemGenerated: boolean;
  content?: unknown;
}

interface ProposalComposerProps {
  proposalId: string;
}

export function ProposalComposer({ proposalId }: ProposalComposerProps) {
  const [proposal, setProposal] = useState<ProposalData | null>(null);
  const [blocks, setBlocks] = useState<BlockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const router = useRouter();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await getProposalComposerData(proposalId);
      if (res.success && res.data) {
        setProposal(res.data.proposal);
        setBlocks(res.data.blocks || []);
      } else {
        toast.error(res.message || "Failed to load proposal composer");
      }
    } catch {
      toast.error("Error loading proposal document");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [proposalId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [loadData]);

  const handleAddBlock = async (type: "CUSTOM" | "PAGE_BREAK" | "TIMELINE", title?: string) => {
    setIsAdding(true);
    try {
      const res = await createProposalBlock({
        proposalId,
        type: type as ProposalBlockType,
        title,
      });
      if (res.success) {
        toast.success(`Added ${title || type} block`);
        await loadData(true);
      } else {
        toast.error(res.message || "Failed to add block");
      }
    } catch {
      toast.error("Error adding block");
    } finally {
      setIsAdding(false);
    }
  };

  const handleUpdateTitle = async (id: string, title: string) => {
    // Optimistic update
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, title } : b)));
    try {
      const res = await updateProposalBlock(id, proposalId, { title });
      if (!res.success) {
        toast.error(res.message || "Failed to rename block");
        await loadData(true);
      } else {
        toast.success("Renamed block");
      }
    } catch {
      toast.error("Error renaming block");
      await loadData(true);
    }
  };

  const handleSaveContent = async (id: string, content: Record<string, unknown>) => {
    const res = await updateProposalBlock(id, proposalId, { content });
    if (!res.success) {
      throw new Error(res.message || "Failed to save block content");
    }
    // Update local state
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, content } : b)));
  };

  const handleToggleVisibility = async (id: string, isVisible: boolean) => {
    // Optimistic
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, isVisible } : b)));
    try {
      const res = await toggleBlockVisibility(id, proposalId, isVisible);
      if (res.success) {
        toast.success(res.message);
      } else {
        toast.error(res.message || "Failed to toggle visibility");
        await loadData(true);
      }
    } catch {
      toast.error("Error toggling visibility");
      await loadData(true);
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      const res = await duplicateProposalBlock(id, proposalId);
      if (res.success) {
        toast.success("Duplicated block");
        await loadData(true);
      } else {
        toast.error(res.message || "Failed to duplicate block");
      }
    } catch {
      toast.error("Error duplicating block");
    }
  };

  const handleDelete = async (id: string) => {
    // Optimistic
    const oldBlocks = [...blocks];
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    try {
      const res = await deleteProposalBlock(id, proposalId);
      if (res.success) {
        toast.success("Deleted block");
      } else {
        toast.error(res.message || "Failed to delete block");
        setBlocks(oldBlocks);
      }
    } catch {
      toast.error("Error deleting block");
      setBlocks(oldBlocks);
    }
  };

  const handleMoveArrow = async (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= blocks.length) return;

    const currentBlock = blocks[index];
    const targetBlock = blocks[targetIndex];

    const newBlocksOrder = [
      { id: currentBlock.id, sortOrder: targetBlock.sortOrder },
      { id: targetBlock.id, sortOrder: currentBlock.sortOrder },
    ];

    // Optimistic swap
    const reordered = [...blocks];
    reordered[index] = { ...targetBlock, sortOrder: currentBlock.sortOrder };
    reordered[targetIndex] = { ...currentBlock, sortOrder: targetBlock.sortOrder };
    setBlocks(reordered);

    try {
      const res = await reorderProposalBlocks({
        proposalId,
        items: newBlocksOrder,
      });
      if (!res.success) {
        toast.error("Failed to reorder blocks");
        await loadData(true);
      }
    } catch {
      toast.error("Error saving block order");
      await loadData(true);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = blocks.findIndex((b) => b.id === active.id);
      const newIndex = blocks.findIndex((b) => b.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        const newBlocks = arrayMove(blocks, oldIndex, newIndex);
        setBlocks(newBlocks);

        const reorderedPayload = newBlocks.map((b, idx) => ({
          id: b.id,
          sortOrder: idx,
        }));
        try {
          const res = await reorderProposalBlocks({
            proposalId,
            items: reorderedPayload,
          });
          if (!res.success) {
            toast.error("Failed to save block order");
            await loadData(true);
          }
        } catch {
          toast.error("Error saving block order");
          await loadData(true);
        }
      }
    }
  };

  const handlePreviewClick = () => {
    setIsPreviewing(true);
    // Dispatch a global event so child blocks can save their dirty state
    window.dispatchEvent(new CustomEvent("composer-save-all"));
    
    const toastId = toast.loading("Saving unsaved changes...", { duration: 500 });
    
    // Allow time for async saves to fire off before navigating
    setTimeout(() => {
      toast.dismiss(toastId);
      router.push(`/dashboard/proposals/${proposalId}/preview`);
    }, 1500);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-medium text-muted-foreground">
          Initializing document blocks & loading proposal data...
        </p>
      </div>
    );
  }

  const hasTimeline = blocks.some((b) => b.type === "TIMELINE");

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-20">
      {/* Top Banner Navigation & Status */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 rounded-xl bg-card border shadow-xs">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" className="h-8 w-8 shrink-0">
            <Link href={`/dashboard/proposals/${proposalId}/builder`} title="Back to Pricing Builder">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>

          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold truncate text-foreground">
                {proposal?.title || "Proposal Composer"}
              </h1>
              <Badge variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/20">
                Phase 3: Document Composer
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {proposal?.customerDisplayName || proposal?.customer?.displayName || "Client"} • {blocks.length} Sections
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="h-8 gap-1.5 text-xs"
            title="Sync terms, features & blocks from server"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span>Sync</span>
          </Button>

          <Button asChild variant="outline" size="sm" className="h-8 gap-1.5 text-xs bg-emerald-50/50 hover:bg-emerald-100/50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800">
            <Link href={`/dashboard/proposals/${proposalId}/builder`}>
              <DollarSign className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Pricing Builder</span>
            </Link>
          </Button>

          <Button 
            onClick={handlePreviewClick}
            disabled={isPreviewing}
            size="sm" 
            className="h-8 gap-1.5 text-xs"
          >
            {isPreviewing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
            <span>{isPreviewing ? "Preparing..." : "Preview Proposal"}</span>
          </Button>

          <AddBlockMenu onAddBlock={handleAddBlock} isAdding={isAdding} hasTimeline={hasTimeline} />
        </div>
      </div>

      {/* Philosophy Hint Banner */}
      <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200 text-xs">
        <HelpCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
        <div className="flex-1">
          <span className="font-semibold">Document Structure:</span> You can reorder sections via drag-and-drop or Up/Down arrows. Click on custom section titles to rename them. All rich text edits are saved as structured JSON.
        </div>
      </div>

      {/* Block List / Composer Canvas */}
      <div className="space-y-4">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
            {blocks.map((block, idx) => (
              <SortableBlockWrapper
                key={block.id}
                block={block}
                index={idx}
                totalBlocks={blocks.length}
                onUpdateTitle={handleUpdateTitle}
                onToggleVisibility={handleToggleVisibility}
                onDuplicate={handleDuplicate}
                onDelete={handleDelete}
                onMoveArrow={handleMoveArrow}
              >
                {block.type === "COVER" && (
                  <CoverBlockEditor block={block} proposal={proposal || { title: "" }} onSave={handleSaveContent} />
                )}

                {block.type === "PRICING" && (
                  <PricingBlockViewer proposal={proposal || { id: proposalId, subtotal: 0, discount: 0, tax: 0, roundOff: 0, grandTotal: 0, currency: "INR" }} />
                )}

                {(block.type === "FEATURES" || block.type === "TERMS" || block.type === "CUSTOM") && (
                  <RichTextBlockEditor block={block} onSave={handleSaveContent} />
                )}

                {block.type === "TIMELINE" && (
                  <TimelineBlockEditor block={block} onSave={handleSaveContent} />
                )}

                {block.type === "SIGNATURE" && (
                  <SignatureBlockEditor block={block} onSave={handleSaveContent} />
                )}
              </SortableBlockWrapper>
            ))}
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
}
