"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Save, Check, Calendar, Clock, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { TimelineMilestone } from "@/lib/schemas/proposal-composer-schema";

interface TimelineContent {
  milestones?: TimelineMilestone[];
}

interface TimelineBlockEditorProps {
  block: {
    id: string;
    content?: unknown;
  };
  onSave: (id: string, content: Record<string, unknown>) => Promise<void>;
}

export function TimelineBlockEditor({ block, onSave }: TimelineBlockEditorProps) {
  const blockContent = (block.content as TimelineContent) || {};
  const initialMilestones = Array.isArray(blockContent.milestones) ? blockContent.milestones : [];
  const [milestones, setMilestones] = useState<TimelineMilestone[]>(initialMilestones);
  const [savedMilestones, setSavedMilestones] = useState<TimelineMilestone[]>(initialMilestones);
  const isDirty = JSON.stringify(milestones) !== JSON.stringify(savedMilestones);

  const [isSaving, setIsSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  const handleAddMilestone = () => {
    const newId = `m-${Date.now()}`;
    setMilestones([
      ...milestones,
      {
        id: newId,
        title: `Phase ${milestones.length + 1}: Delivery`,
        duration: "1 Week",
        deliverable: "Deliverable item",
      },
    ]);
  };

  const handleRemoveMilestone = (id: string) => {
    setMilestones(milestones.filter((m) => m.id !== id));
  };

  const handleUpdateMilestone = (id: string, field: keyof TimelineMilestone, value: string) => {
    setMilestones(
      milestones.map((m) => (m.id === id ? { ...m, [field]: value } : m))
    );
  };

  const handleSave = async () => {
    if (!isDirty && !justSaved) return;
    setIsSaving(true);
    try {
      await onSave(block.id, { milestones } as Record<string, unknown>);
      setSavedMilestones(milestones);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
      toast.success("Timeline block saved!");
    } catch {
      toast.error("Failed to save timeline block");
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    const handleGlobalSave = () => {
      if (isDirty && !isSaving) {
        handleSave();
      }
    };
    window.addEventListener("composer-save-all", handleGlobalSave);
    return () => window.removeEventListener("composer-save-all", handleGlobalSave);
  }, [isDirty, isSaving]);

  return (
    <div className="space-y-6">
      {/* Description & Header */}
      <div className="flex items-center justify-between bg-muted/20 px-4 py-3 rounded-lg border text-xs">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="h-4 w-4 text-indigo-500" />
          <span>Structured Project Timeline (Phases, Duration & Key Deliverables)</span>
        </div>

        <Button onClick={handleSave} disabled={isSaving || (!isDirty && !justSaved)} size="sm" className="h-7 px-3 text-xs gap-1.5">
          {justSaved ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-500" />
              Saved!
            </>
          ) : !isDirty ? (
            <>
              <Check className="h-3.5 w-3.5 text-muted-foreground" />
              Saved (No Changes)
            </>
          ) : (
            <>
              <Save className="h-3.5 w-3.5" />
              {isSaving ? "Saving..." : "Save Timeline"}
            </>
          )}
        </Button>
      </div>

      {/* Milestones List */}
      {milestones.length === 0 ? (
        <div className="text-center py-8 border border-dashed rounded-lg bg-muted/10">
          <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm font-medium">No phases or milestones added yet.</p>
          <p className="text-xs text-muted-foreground mt-1 mb-4">
            Add milestones to outline your project timeline for the client.
          </p>
          <Button onClick={handleAddMilestone} size="sm" variant="outline" className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Add First Phase
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {milestones.map((milestone, idx) => (
            <div
              key={milestone.id}
              className="flex flex-col md:flex-row items-start md:items-center gap-3 p-3.5 rounded-xl border bg-card hover:border-indigo-200 dark:hover:border-indigo-900 transition-all shadow-2xs"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold text-xs shrink-0">
                {idx + 1}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 flex-1 w-full">
                <div className="md:col-span-5 space-y-1">
                  <Label className="text-[11px] font-medium text-muted-foreground">Phase / Milestone Title</Label>
                  <Input
                    value={milestone.title}
                    onChange={(e) => handleUpdateMilestone(milestone.id, "title", e.target.value)}
                    placeholder="e.g., Requirement Analysis"
                    className="h-8 text-xs bg-background"
                  />
                </div>

                <div className="md:col-span-3 space-y-1">
                  <Label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Duration / Estimated Time
                  </Label>
                  <Input
                    value={milestone.duration}
                    onChange={(e) => handleUpdateMilestone(milestone.id, "duration", e.target.value)}
                    placeholder="e.g., 2 Weeks"
                    className="h-8 text-xs bg-background font-mono"
                  />
                </div>

                <div className="md:col-span-4 space-y-1">
                  <Label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                    Key Deliverables / Outcome
                  </Label>
                  <Input
                    value={milestone.deliverable}
                    onChange={(e) => handleUpdateMilestone(milestone.id, "deliverable", e.target.value)}
                    placeholder="e.g., Technical Architecture Doc"
                    className="h-8 text-xs bg-background"
                  />
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:bg-destructive/10 shrink-0 mt-1 md:mt-0 self-end md:self-center"
                onClick={() => handleRemoveMilestone(milestone.id)}
                title="Remove Phase"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {milestones.length > 0 && (
        <div className="flex justify-between items-center pt-2">
          <Button onClick={handleAddMilestone} variant="outline" size="sm" className="gap-1.5 text-xs">
            <Plus className="h-3.5 w-3.5" />
            Add Another Phase
          </Button>

          <Button onClick={handleSave} disabled={isSaving || (!isDirty && !justSaved)} size="sm" className="gap-1.5 text-xs">
            {justSaved ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-500" />
                Saved!
              </>
            ) : !isDirty ? (
              <>
                <Check className="h-3.5 w-3.5 text-muted-foreground" />
                Saved (No Changes)
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5" />
                {isSaving ? "Saving..." : "Save All Milestones"}
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
