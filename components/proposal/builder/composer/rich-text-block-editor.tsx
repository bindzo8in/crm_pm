"use client";

import { useState, useEffect } from "react";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Button } from "@/components/ui/button";
import { Save, Check, AlertCircle, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface RichTextBlockEditorProps {
  block: {
    id: string;
    content?: unknown;
    type?: string;
  };
  onSave: (id: string, content: Record<string, unknown>) => Promise<void>;
}

export function RichTextBlockEditor({ block, onSave }: RichTextBlockEditorProps) {
  const [content, setContent] = useState<Record<string, unknown>>((block.content as Record<string, unknown>) || {});
  const [prevBlockContent, setPrevBlockContent] = useState(block.content);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  // Sync state during rendering if parent block.content changes when not dirty
  if (block.content !== prevBlockContent) {
    setPrevBlockContent(block.content);
    if (!isDirty) {
      setContent((block.content as Record<string, unknown>) || {});
    }
  }

  const handleContentChange = (newVal: Record<string, unknown>) => {
    setContent(newVal);
    setIsDirty(true);
    setJustSaved(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(block.id, content);
      setIsDirty(false);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
      toast.success("Section content saved!");
    } catch {
      toast.error("Failed to save section content");
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
    <div className="space-y-4">
      {/* Editor Top Bar with Status indicator */}
      <div className="flex items-center justify-between bg-muted/20 px-3 py-2 rounded-lg border text-xs">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-blue-500" />
          <span>TipTap Rich Text (Supports tables, images, headings & lists)</span>
        </div>

        <div className="flex items-center gap-3">
          {isDirty && (
            <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
              <AlertCircle className="h-3.5 w-3.5" />
              Unsaved changes
            </span>
          )}

          <Button
            size="sm"
            onClick={handleSave}
            disabled={!isDirty || isSaving}
            className="h-7 px-3 text-xs gap-1.5 shadow-xs"
          >
            {justSaved ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-500" />
                Saved!
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5" />
                {isSaving ? "Saving..." : "Save Content"}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Reusable TipTap Editor Component */}
      <div className="min-h-[220px]">
        <RichTextEditor
          value={content}
          onChange={handleContentChange}
          placeholder="Start typing your section content here..."
          className="bg-background shadow-2xs"
        />
      </div>
    </div>
  );
}
