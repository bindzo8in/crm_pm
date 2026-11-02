"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Loader2,
  RefreshCw,
  RotateCcw,
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
  syncProposalComposerTermsAndFeatures,
  createProposalBlock,
  updateProposalBlock,
  reorderProposalBlocks,
  duplicateProposalBlock,
  deleteProposalBlock,
  toggleBlockVisibility,
} from "@/actions/proposal-composer";

import { AddBlockMenu } from "./add-block-menu";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SortableBlockWrapper } from "./sortable-block-wrapper";
import { CoverBlockEditor } from "./cover-block-editor";
import { PricingBlockViewer } from "./pricing-block-viewer";
import { PricingSummaryBlockViewer } from "./pricing-summary-block-viewer";
import { RichTextBlockEditor } from "./rich-text-block-editor";
import { TimelineBlockEditor } from "./timeline-block-editor";
import { SignatureBlockEditor } from "./signature-block-editor";
import { ProposalBlockType } from "@/app/generated/prisma/client";
import { ProposalWorkflowNav } from "@/components/proposal/proposal-workflow-nav";
import { ProposalWorkflowActionBar } from "@/components/proposal/proposal-workflow-action-bar";
import { proposalDocumentStepSchema } from "@/lib/schemas/proposal-workflow-schema";

interface ProposalData {
  id: string;
  title: string;
  status?: string;
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
    features?: Array<{
      id: string;
      content: string;
      isHeading: boolean;
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

  const handleSync = async () => {
    setRefreshing(true);
    try {
      const res = await syncProposalComposerTermsAndFeatures(proposalId, false);
      if (res.success && res.data) {
        setProposal(res.data.proposal);
        setBlocks(res.data.blocks || []);
        toast.success("Synced terms, features & pricing with document blocks!");
      } else {
        toast.error(res.message || "Failed to sync document blocks");
      }
    } catch {
      toast.error("Error syncing proposal document");
    } finally {
      setRefreshing(false);
    }
  };

  const handleReset = async () => {
    setRefreshing(true);
    try {
      const res = await syncProposalComposerTermsAndFeatures(proposalId, true);
      if (res.success && res.data) {
        setProposal(res.data.proposal);
        setBlocks(res.data.blocks || []);
        toast.success("Reset terms & features to source table!");
      } else {
        toast.error(res.message || "Failed to reset document blocks");
      }
    } catch {
      toast.error("Error resetting proposal document");
    } finally {
      setRefreshing(false);
    }
  };

  const handleAddBlock = async (
    type: "CUSTOM" | "PAGE_BREAK" | "TIMELINE" | "PRICING_SUMMARY",
    title?: string
  ) => {
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

  const handlePreviewClick = async () => {
    setIsPreviewing(true);
    const savePromises: Promise<void>[] = [];
    
    // Dispatch a global event so child blocks can save their dirty state
    window.dispatchEvent(new CustomEvent("composer-save-all", { detail: { promises: savePromises } }));
    
    const toastId = toast.loading("Saving unsaved changes...", { duration: 500 });
    
    try {
      if (savePromises.length > 0) {
        await Promise.all(savePromises);
      }
      toast.dismiss(toastId);
      router.push(`/dashboard/proposals/${proposalId}/preview`);
    } catch {
      toast.dismiss(toastId);
      toast.error("Failed to save some changes before previewing");
      setIsPreviewing(false);
    }
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
  const documentValidation = proposalDocumentStepSchema.safeParse({
    blocks: blocks.map((block) => ({
      type: block.type,
      sortOrder: block.sortOrder,
      isVisible: block.isVisible,
    })),
  });

  if (proposal && proposal.status !== "DRAFT") {
    return (
      <div className="w-full space-y-6">
        <ProposalWorkflowNav
          proposalId={proposalId}
          activeStep={3}
          title={proposal.title}
          customerName={proposal.customerDisplayName || proposal.customer?.displayName}
          status={proposal.status}
          maxAvailableStep={4}
        />
        <section className="max-w-2xl space-y-3 py-4">
          <h2 className="text-lg font-semibold">This proposal is read-only</h2>
          <p className="text-sm text-muted-foreground">
            {proposal.status} proposals cannot be changed. Duplicate this proposal from the proposals list to create a new draft.
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

  return (
    <div className="w-full space-y-6 pb-28">
      <ProposalWorkflowNav
        proposalId={proposalId}
        activeStep={3}
        title={proposal?.title}
        customerName={proposal?.customerDisplayName || proposal?.customer?.displayName}
        status={proposal?.status}
        maxAvailableStep={documentValidation.success ? 4 : 3}
      />

      <div className="flex flex-col gap-4 border-b pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <h2 className="text-base font-semibold tracking-tight">Document content</h2>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Arrange sections and refine the wording before previewing the proposal.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:justify-end">
          <div className="order-2 sm:order-none">
            <AddBlockMenu onAddBlock={handleAddBlock} isAdding={isAdding} hasTimeline={hasTimeline} />
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={refreshing}
            className="order-3 h-9 gap-2 sm:order-none"
            title="Refresh document terms and features without replacing custom edits"
          >
            <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
            <span>Sync content</span>
          </Button>

          <ConfirmDialog
            trigger={
              <Button
                variant="outline"
                size="sm"
                disabled={refreshing}
                className="order-4 h-9 gap-2 border-destructive/20 text-destructive hover:bg-destructive/10 hover:text-destructive sm:order-none"
                title="Replace edited terms and features with the source table"
              >
                <RotateCcw className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
                <span>Reset content</span>
              </Button>
            }
            title="Reset features and terms?"
            description="This will overwrite custom feature and term changes with the source table."
            confirmLabel="Reset changes"
            disabled={refreshing}
            onConfirm={() => void handleReset()}
          />
        </div>
      </div>

      {!documentValidation.success && (
        <p role="status" className="border-l-2 border-amber-500 py-2 pl-3 text-sm text-muted-foreground">
          Show at least one document section to unlock Step 4: Review &amp; send.
        </p>
      )}

      <div className="flex items-start gap-3 border-l-2 border-primary/40 py-1 pl-3 text-sm text-muted-foreground">
        <HelpCircle className="mt-0.5 size-4 shrink-0 text-primary" />
        <div className="flex-1">
          Reorder sections with drag and drop or the move controls. Rich-text edits save as you leave each section; use Preview to review the finished proposal.
        </div>
      </div>

      {/* Block List / Composer Canvas */}
      <div className="space-y-6">
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

                {block.type === "PRICING_SUMMARY" && (
                  <PricingSummaryBlockViewer proposal={proposal || { id: proposalId, currency: "INR" }} />
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
      <ProposalWorkflowActionBar>
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          {!documentValidation.success && (
            <p role="status" className="text-xs text-muted-foreground">
              Show at least one document section to enable preview.
            </p>
          )}
          <Button
            onClick={handlePreviewClick}
            disabled={isPreviewing || !documentValidation.success}
            className="w-full gap-2 sm:w-auto"
          >
            {isPreviewing ? <Loader2 className="size-4 animate-spin" /> : <Eye className="size-4" />}
            <span>{isPreviewing ? "Saving changes…" : "Preview proposal"}</span>
          </Button>
        </div>
      </ProposalWorkflowActionBar>
    </div>
  );
}
