"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  GripVertical,
  ChevronUp,
  ChevronDown,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  Copy,
  Trash2,
  Lock,
  FileText,
  DollarSign,
  Sparkles,
  ShieldCheck,
  Calendar,
  PenTool,
  Scissors,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ProposalBlockType } from "@/app/generated/prisma/client";

interface SortableBlockWrapperProps {
  block: {
    id: string;
    type: ProposalBlockType | string;
    title?: string | null;
    sortOrder: number;
    isVisible: boolean;
    isLocked: boolean;
    isSystemGenerated: boolean;
    content?: unknown;
  };
  index: number;
  totalBlocks: number;
  onUpdateTitle: (id: string, title: string) => Promise<void>;
  onToggleVisibility: (id: string, isVisible: boolean) => Promise<void>;
  onDuplicate: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onMoveArrow: (index: number, direction: "up" | "down") => Promise<void>;
  children: React.ReactNode;
}

export function SortableBlockWrapper({
  block,
  index,
  totalBlocks,
  onUpdateTitle,
  onToggleVisibility,
  onDuplicate,
  onDelete,
  onMoveArrow,
  children,
}: SortableBlockWrapperProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(block.title || "");

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
  };

  const getBlockIcon = () => {
    switch (block.type) {
      case "COVER":
        return <FileText className="h-4 w-4 text-blue-500" />;
      case "PRICING":
        return <DollarSign className="h-4 w-4 text-emerald-500" />;
      case "FEATURES":
        return <Sparkles className="h-4 w-4 text-purple-500" />;
      case "TERMS":
        return <ShieldCheck className="h-4 w-4 text-amber-500" />;
      case "TIMELINE":
        return <Calendar className="h-4 w-4 text-indigo-500" />;
      case "SIGNATURE":
        return <PenTool className="h-4 w-4 text-rose-500" />;
      case "PAGE_BREAK":
        return <Scissors className="h-4 w-4 text-muted-foreground" />;
      default:
        return <FileText className="h-4 w-4 text-sky-500" />;
    }
  };

  const getBadgeVariant = (): "default" | "secondary" | "outline" => {
    if (block.type === "PAGE_BREAK") return "secondary";
    if (block.isSystemGenerated) return "outline";
    return "default";
  };

  const handleTitleSubmit = async () => {
    setIsEditingTitle(false);
    if (titleValue.trim() && titleValue !== block.title) {
      await onUpdateTitle(block.id, titleValue.trim());
    } else {
      setTitleValue(block.title || "");
    }
  };

  const canEditTitle = !block.isLocked && block.type !== "PRICING";
  const canDelete = !block.isLocked && !["COVER", "PRICING", "FEATURES", "TERMS", "SIGNATURE"].includes(block.type as string);
  const canDuplicate = !block.isSystemGenerated && block.type === "CUSTOM";

  if (block.type === "PAGE_BREAK") {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          "group relative flex items-center justify-between rounded-lg border border-dashed border-purple-300 dark:border-purple-800 bg-purple-50/40 dark:bg-purple-950/20 py-3 px-4 transition-all hover:border-purple-400",
          isDragging && "opacity-50 ring-2 ring-primary ring-offset-2",
          !block.isVisible && "opacity-60 grayscale"
        )}
      >
        <div className="flex items-center gap-3">
          <button
            {...attributes}
            {...listeners}
            type="button"
            className="cursor-grab touch-none p-1 text-muted-foreground/60 hover:text-foreground active:cursor-grabbing"
            title="Drag to reorder"
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2 text-sm font-medium text-purple-700 dark:text-purple-300">
            <Scissors className="h-4 w-4" />
            <span>--- Page Break ---</span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground"
            onClick={() => onMoveArrow(index, "up")}
            disabled={index === 0}
            title="Move Up"
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground"
            onClick={() => onMoveArrow(index, "down")}
            disabled={index === totalBlocks - 1}
            title="Move Down"
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground"
            onClick={() => onToggleVisibility(block.id, !block.isVisible)}
            title={block.isVisible ? "Hide Block" : "Show Block"}
          >
            {block.isVisible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:bg-destructive/10"
            onClick={() => onDelete(block.id)}
            title="Delete Page Break"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group rounded-xl border bg-card text-card-foreground shadow-xs transition-all",
        isDragging && "opacity-50 ring-2 ring-primary ring-offset-2",
        !block.isVisible && "opacity-60 border-dashed bg-muted/20"
      )}
    >
      {/* Block Header */}
      <div className="flex items-center justify-between border-b px-4 py-3 bg-muted/30 rounded-t-xl">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button
            {...attributes}
            {...listeners}
            type="button"
            className="cursor-grab touch-none p-1 text-muted-foreground/60 hover:text-foreground active:cursor-grabbing"
            title="Drag to reorder"
          >
            <GripVertical className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-2">
            {getBlockIcon()}
          </div>

          {isEditingTitle && canEditTitle ? (
            <Input
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              onBlur={handleTitleSubmit}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleTitleSubmit();
                if (e.key === "Escape") {
                  setTitleValue(block.title || "");
                  setIsEditingTitle(false);
                }
              }}
              className="h-7 text-sm font-medium max-w-[280px]"
              autoFocus
            />
          ) : (
            <div
              onClick={() => {
                if (canEditTitle) setIsEditingTitle(true);
              }}
              className={cn(
                "flex items-center gap-2 text-sm font-semibold truncate",
                canEditTitle && "cursor-pointer hover:underline decoration-dashed decoration-muted-foreground"
              )}
              title={canEditTitle ? "Click to rename" : "Protected title"}
            >
              <span>{block.title || "Untitled Block"}</span>
              {block.isLocked && <span title="Locked Block"><Lock className="h-3 w-3 text-muted-foreground" /></span>}
            </div>
          )}

          <Badge variant={getBadgeVariant()} className="text-[10px] px-1.5 py-0 font-normal">
            {block.type === "CUSTOM" ? "Custom Block" : `${block.type} Block`}
          </Badge>

          {!block.isVisible && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
              Hidden in PDF/Preview
            </Badge>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1">
          <div className="flex items-center border-r pr-1 mr-1 gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground"
              onClick={() => onMoveArrow(index, "up")}
              disabled={index === 0}
              title="Move Up"
            >
              <ArrowUp className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground"
              onClick={() => onMoveArrow(index, "down")}
              disabled={index === totalBlocks - 1}
              title="Move Down"
            >
              <ArrowDown className="h-3.5 w-3.5" />
            </Button>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground"
            onClick={() => onToggleVisibility(block.id, !block.isVisible)}
            title={block.isVisible ? "Hide Block" : "Show Block"}
          >
            {block.isVisible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          </Button>

          {canDuplicate && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={() => onDuplicate(block.id)}
              title="Duplicate Custom Block"
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
          )}

          {canDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:bg-destructive/10"
              onClick={() => onDelete(block.id)}
              title="Delete Block"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground ml-1"
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? "Collapse Block" : "Expand Block"}
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Block Content Body */}
      {isExpanded ? (
        <div className="p-4">{children}</div>
      ) : (
        <div className="px-4 py-2.5 text-xs text-muted-foreground italic bg-muted/10">
          Block content collapsed. Click the expand arrow above to view or edit.
        </div>
      )}
    </div>
  );
}
