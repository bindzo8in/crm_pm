"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Save, Check, FileText, Building, Calendar, User } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";

interface CoverBlockContent {
  subtitle?: string;
  preparedFor?: string;
  preparedBy?: string;
  date?: string;
  layoutStyle?: "MODERN" | "CLASSIC" | "MINIMAL";
  showProposalTitle?: boolean;
  showNotes?: boolean;
}

interface CoverBlockEditorProps {
  block: {
    id: string;
    content?: unknown;
  };
  proposal: {
    title: string;
    customerDisplayName?: string;
    customer?: { displayName: string; companyName?: string | null };
  };
  onSave: (id: string, content: Record<string, unknown>) => Promise<void>;
}

export function CoverBlockEditor({ block, proposal, onSave }: CoverBlockEditorProps) {
  const blockContent = (block.content as CoverBlockContent) || {};
  const initialForm = {
    subtitle: blockContent.subtitle ?? "Commercial & Technical Proposal",
    preparedFor:
      blockContent.preparedFor ??
      proposal.customerDisplayName ??
      proposal.customer?.displayName ??
      "Client",
    preparedBy: blockContent.preparedBy ?? "Sales Executive",
    date:
      blockContent.date ??
      new Date().toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" }),
    layoutStyle: blockContent.layoutStyle ?? "MODERN",
    showProposalTitle: blockContent.showProposalTitle ?? true,
    showNotes: blockContent.showNotes ?? true,
  };
  const [form, setForm] = useState(initialForm);
  const [savedForm, setSavedForm] = useState(initialForm);
  const isDirty = JSON.stringify(form) !== JSON.stringify(savedForm);

  const [isSaving, setIsSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(block.id, form as Record<string, unknown>);
      setSavedForm(form);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
      toast.success("Cover details saved!");
    } catch {
      toast.error("Failed to save cover details");
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
    <div className="space-y-6 bg-gradient-to-br from-blue-50/30 to-transparent dark:from-blue-950/10 p-6 rounded-lg border">
      {/* Read-only Proposal Title Display */}
      <div className="border-b pb-4">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Proposal Main Title (Read-Only from Proposal)
        </Label>
        <div className="mt-1 text-xl font-bold text-foreground flex items-center gap-2">
          <FileText className="h-5 w-5 text-blue-500" />
          <span>{proposal.title}</span>
        </div>
      </div>

      {/* Editable Fields Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="cover-subtitle" className="text-xs font-medium">
            Subtitle / Document Type
          </Label>
          <Input
            id="cover-subtitle"
            value={form.subtitle}
            onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
            placeholder="e.g., Commercial & Technical Proposal"
            className="bg-background"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="cover-style" className="text-xs font-medium">
            Cover Layout Style
          </Label>
          <Select
            value={form.layoutStyle}
            onValueChange={(val) => setForm({ ...form, layoutStyle: val as "MODERN" | "CLASSIC" | "MINIMAL" })}
          >
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Select layout style" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="MODERN">✨ Modern Vibrant (Gradient Banner)</SelectItem>
              <SelectItem value="CLASSIC">🏛️ Classic Corporate (Bordered Header)</SelectItem>
              <SelectItem value="MINIMAL">🍃 Minimalist Clean (Centered Serif)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="cover-for" className="text-xs font-medium flex items-center gap-1.5">
            <Building className="h-3.5 w-3.5 text-muted-foreground" />
            Prepared For (Client Name / Company)
          </Label>
          <Input
            id="cover-for"
            value={form.preparedFor}
            onChange={(e) => setForm({ ...form, preparedFor: e.target.value })}
            placeholder="Client Name"
            className="bg-background"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="cover-by" className="text-xs font-medium flex items-center gap-1.5">
            <User className="h-3.5 w-3.5 text-muted-foreground" />
            Prepared By (Author / Account Rep)
          </Label>
          <Input
            id="cover-by"
            value={form.preparedBy}
            onChange={(e) => setForm({ ...form, preparedBy: e.target.value })}
            placeholder="Your Name"
            className="bg-background"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="cover-date" className="text-xs font-medium flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            Document Date
          </Label>
          <Input
            id="cover-date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            placeholder="e.g., 01 July 2026"
            className="bg-background max-w-sm"
          />
        </div>
      </div>

      <div className="flex gap-8 py-4 border-t border-b border-border my-6">
        <div className="flex items-center space-x-2">
          <Switch 
            id="show-proposal-title" 
            checked={form.showProposalTitle} 
            onCheckedChange={(checked) => setForm({ ...form, showProposalTitle: checked })} 
          />
          <Label htmlFor="show-proposal-title" className="text-sm">Show Proposal Title</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Switch 
            id="show-notes" 
            checked={form.showNotes} 
            onCheckedChange={(checked) => setForm({ ...form, showNotes: checked })} 
          />
          <Label htmlFor="show-notes" className="text-sm">Show Proposal Notes</Label>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <Button onClick={handleSave} disabled={isSaving || (!isDirty && !justSaved)} className="gap-2">
          {justSaved ? (
            <>
              <Check className="h-4 w-4 text-emerald-500" />
              Saved!
            </>
          ) : !isDirty ? (
            <>
              <Check className="h-4 w-4 text-muted-foreground" />
              Saved (No Changes)
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              {isSaving ? "Saving..." : "Save Cover Details"}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
