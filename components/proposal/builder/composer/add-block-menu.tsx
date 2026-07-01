"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, FileText, Scissors, Calendar, Sparkles, Lock } from "lucide-react";

interface AddBlockMenuProps {
  onAddBlock: (type: "CUSTOM" | "PAGE_BREAK" | "TIMELINE", title?: string) => Promise<void>;
  isAdding: boolean;
  hasTimeline: boolean;
}

export function AddBlockMenu({ onAddBlock, isAdding, hasTimeline }: AddBlockMenuProps) {
  const [customModalOpen, setCustomModalOpen] = useState(false);
  const [customTitle, setCustomTitle] = useState("");

  const handleCreateCustom = async () => {
    if (!customTitle.trim()) return;
    await onAddBlock("CUSTOM", customTitle.trim());
    setCustomTitle("");
    setCustomModalOpen(false);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button disabled={isAdding} className="bg-primary text-primary-foreground gap-2 shadow-sm">
            <Plus className="h-4 w-4" />
            Add Block
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Document Sections
          </DropdownMenuLabel>
          <DropdownMenuItem
            onClick={() => {
              setCustomTitle("New Section");
              setCustomModalOpen(true);
            }}
            className="gap-2.5 py-2.5 cursor-pointer"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
              <FileText className="h-4 w-4" />
            </div>
            <div className="flex flex-col">
              <span className="font-medium text-sm">Custom Text Block</span>
              <span className="text-[11px] text-muted-foreground">Rich text section (Scope, Intro, etc.)</span>
            </div>
          </DropdownMenuItem>

          <DropdownMenuItem
            disabled={hasTimeline}
            onClick={() => onAddBlock("TIMELINE")}
            className="gap-2.5 py-2.5 cursor-pointer"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
              <Calendar className="h-4 w-4" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-medium text-sm">Project Timeline</span>
                {hasTimeline && <Lock className="h-3 w-3 text-muted-foreground" />}
              </div>
              <span className="text-[11px] text-muted-foreground">
                {hasTimeline ? "Already added (Only 1 allowed)" : "Structured project phases & duration"}
              </span>
            </div>
          </DropdownMenuItem>

          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Layout & Formatting
          </DropdownMenuLabel>

          <DropdownMenuItem
            onClick={() => onAddBlock("PAGE_BREAK")}
            className="gap-2.5 py-2.5 cursor-pointer"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400">
              <Scissors className="h-4 w-4" />
            </div>
            <div className="flex flex-col">
              <span className="font-medium text-sm">Page Break</span>
              <span className="text-[11px] text-muted-foreground">Starts a new page in PDF & Print</span>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={customModalOpen} onOpenChange={setCustomModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-blue-500" />
              Add Custom Text Block
            </DialogTitle>
            <DialogDescription>
              Create a new rich text section. You can name it Introduction, Scope of Work, About Us, or anything else.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="block-title">Section Title</Label>
              <Input
                id="block-title"
                placeholder="e.g., Scope of Work, Project Deliverables..."
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleCreateCustom();
                  }
                }}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCustomModalOpen(false)}>
              Cancel
            </Button>
            <Button disabled={!customTitle.trim() || isAdding} onClick={handleCreateCustom}>
              Add Section
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
