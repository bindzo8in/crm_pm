"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Save, Check, PenTool, Building2, UserCheck } from "lucide-react";
import { toast } from "sonner";

interface SignatureContent {
  clientSignatory?: string;
  clientDesignation?: string;
  companySignatory?: string;
  companyDesignation?: string;
}

interface SignatureBlockEditorProps {
  block: {
    id: string;
    content?: unknown;
  };
  onSave: (id: string, content: Record<string, unknown>) => Promise<void>;
}

export function SignatureBlockEditor({ block, onSave }: SignatureBlockEditorProps) {
  const blockContent = (block.content as SignatureContent) || {};
  const initialForm = {
    clientSignatory: blockContent.clientSignatory ?? "Authorized Signatory",
    clientDesignation: blockContent.clientDesignation ?? "Client Representative",
    companySignatory: blockContent.companySignatory ?? "Account Executive",
    companyDesignation: blockContent.companyDesignation ?? "Company Representative",
  };
  const [form, setForm] = useState(initialForm);
  const [savedForm, setSavedForm] = useState(initialForm);
  const isDirty = JSON.stringify(form) !== JSON.stringify(savedForm);

  const [isSaving, setIsSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  const handleSave = async () => {
    if (!isDirty && !justSaved) return;
    setIsSaving(true);
    try {
      await onSave(block.id, form);
      setSavedForm(form);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
      toast.success("Signature block details updated!");
    } catch {
      toast.error("Failed to save signature block");
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
      <div className="flex items-center justify-between bg-muted/20 px-4 py-3 rounded-lg border text-xs">
        <div className="flex items-center gap-2 text-muted-foreground">
          <PenTool className="h-4 w-4 text-rose-500" />
          <span>Acceptance & Sign-off Card (Will display signature lines and date lines in print/PDF)</span>
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
              {isSaving ? "Saving..." : "Save Signatories"}
            </>
          )}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Client Signatory Card */}
        <div className="p-5 rounded-xl border bg-card/60 space-y-4">
          <div className="flex items-center gap-2 border-b pb-2.5 text-sm font-semibold text-foreground">
            <UserCheck className="h-4 w-4 text-blue-500" />
            <span>Client Acceptance / Signatory</span>
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="client-sig" className="text-xs font-medium">
                Signatory Title / Default Name
              </Label>
              <Input
                id="client-sig"
                value={form.clientSignatory}
                onChange={(e) => setForm({ ...form, clientSignatory: e.target.value })}
                placeholder="e.g., Authorized Signatory"
                className="bg-background text-xs h-8"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="client-desg" className="text-xs font-medium">
                Designation / Role
              </Label>
              <Input
                id="client-desg"
                value={form.clientDesignation}
                onChange={(e) => setForm({ ...form, clientDesignation: e.target.value })}
                placeholder="e.g., Director / Representative"
                className="bg-background text-xs h-8"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-dashed">
            <div className="h-12 border-b border-muted-foreground/40 flex items-end pb-1 text-[11px] text-muted-foreground italic">
              Signature & Stamp: ________________________
            </div>
          </div>
        </div>

        {/* Company Signatory Card */}
        <div className="p-5 rounded-xl border bg-card/60 space-y-4">
          <div className="flex items-center gap-2 border-b pb-2.5 text-sm font-semibold text-foreground">
            <Building2 className="h-4 w-4 text-emerald-500" />
            <span>Company Representative / Signatory</span>
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="comp-sig" className="text-xs font-medium">
                Signatory Name / Account Exec
              </Label>
              <Input
                id="comp-sig"
                value={form.companySignatory}
                onChange={(e) => setForm({ ...form, companySignatory: e.target.value })}
                placeholder="e.g., Your Name"
                className="bg-background text-xs h-8"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="comp-desg" className="text-xs font-medium">
                Designation / Role
              </Label>
              <Input
                id="comp-desg"
                value={form.companyDesignation}
                onChange={(e) => setForm({ ...form, companyDesignation: e.target.value })}
                placeholder="e.g., Account Executive"
                className="bg-background text-xs h-8"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-dashed">
            <div className="h-12 border-b border-muted-foreground/40 flex items-end pb-1 text-[11px] text-muted-foreground italic">
              Signature & Date: ________________________
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
