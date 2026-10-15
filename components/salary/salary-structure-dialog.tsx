"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { RefreshCwIcon, SaveIcon, PlusIcon, TrashIcon } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { SalaryEmployee } from "./types";

interface SalaryStructureDialogProps {
  isOpen: boolean;
  onClose: () => void;
  user: SalaryEmployee;
}

export function SalaryStructureDialog({ isOpen, onClose, user }: SalaryStructureDialogProps) {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  
  const [basicSalary, setBasicSalary] = useState("0");
  const [hra, setHra] = useState("0");
  const [conveyance, setConveyance] = useState("0");
  const [medical, setMedical] = useState("0");
  const [specialAllowance, setSpecialAllowance] = useState("0");
  
  const [providentFund, setProvidentFund] = useState("0");
  const [professionalTax, setProfessionalTax] = useState("0");
  const [tds, setTds] = useState("0");
  const [customComponents, setCustomComponents] = useState<Array<{ name: string; type: "EARNING" | "DEDUCTION"; amount: number }>>([]);

  useEffect(() => {
    if (isOpen) {
      const fetchStructure = async () => {
        setFetching(true);
        setFetchError(null);
        try {
          const res = await fetch(`/api/salary/structure?userId=${user.id}`);
          const data = await res.json();
          if (!res.ok || !data.success) {
            throw new Error(data.error || "Failed to load salary structure.");
          }
          if (data.success && data.structure) {
            const st = data.structure;
            setBasicSalary(st.basicSalary.toString());
            setHra(st.hra.toString());
            setConveyance(st.conveyance.toString());
            setMedical(st.medical.toString());
            setSpecialAllowance(st.specialAllowance.toString());
            setProvidentFund(st.providentFund.toString());
            setProfessionalTax(st.professionalTax.toString());
            setTds(st.tds.toString());
            setCustomComponents(st.customComponents || []);
          }
        } catch (error) {
          console.error("Failed to fetch structure", error);
          setFetchError(error instanceof Error ? error.message : "Failed to load salary structure.");
        } finally {
          setFetching(false);
        }
      };
      fetchStructure();
    }
  }, [isOpen, user.id, loadAttempt]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/salary/structure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          basicSalary: Number(basicSalary) || 0,
          hra: Number(hra) || 0,
          conveyance: Number(conveyance) || 0,
          medical: Number(medical) || 0,
          specialAllowance: Number(specialAllowance) || 0,
          providentFund: Number(providentFund) || 0,
          professionalTax: Number(professionalTax) || 0,
          tds: Number(tds) || 0,
          customComponents
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Salary structure saved successfully.");
        onClose();
      } else {
        toast.error(data.error || "Failed to save structure");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save structure");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl bg-background border-border p-6 rounded-3xl">
        <DialogHeader>
          <DialogTitle>Salary Structure</DialogTitle>
          <DialogDescription>Set the fixed earnings and deductions for {user.name}.</DialogDescription>
        </DialogHeader>

        {fetching ? (
          <div className="py-10 text-center text-muted-foreground text-sm flex items-center justify-center gap-2">
            <RefreshCwIcon className="w-4 h-4 animate-spin" /> Loading structure...
          </div>
        ) : fetchError ? (
          <div role="alert" className="space-y-4 py-6 text-center">
            <p className="text-sm text-destructive">{fetchError}</p>
            <Button variant="outline" onClick={() => setLoadAttempt((attempt) => attempt + 1)}>
              Retry
            </Button>
          </div>
        ) : (
          <div className="space-y-6 mt-4">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="font-bold text-sm border-b pb-2">Earnings</h3>
                
                <div className="space-y-1.5">
                  <Label className="text-xs">Basic Salary</Label>
                  <Input type="number" min="0" value={basicSalary} onChange={e => setBasicSalary(e.target.value)} className="rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">House Rent Allowance (HRA)</Label>
                  <Input type="number" min="0" value={hra} onChange={e => setHra(e.target.value)} className="rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Conveyance Allowance</Label>
                  <Input type="number" min="0" value={conveyance} onChange={e => setConveyance(e.target.value)} className="rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Medical Allowance (Fixed)</Label>
                  <Input type="number" min="0" value={medical} onChange={e => setMedical(e.target.value)} className="rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Special Allowance</Label>
                  <Input type="number" min="0" value={specialAllowance} onChange={e => setSpecialAllowance(e.target.value)} className="rounded-xl" />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-bold text-sm border-b pb-2">Deductions</h3>
                
                <div className="space-y-1.5">
                  <Label className="text-xs">Provident Fund (PF)</Label>
                  <Input type="number" min="0" value={providentFund} onChange={e => setProvidentFund(e.target.value)} className="rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Professional Tax (PT)</Label>
                  <Input type="number" min="0" value={professionalTax} onChange={e => setProfessionalTax(e.target.value)} className="rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Tax Deducted at Source (TDS)</Label>
                  <Input type="number" min="0" value={tds} onChange={e => setTds(e.target.value)} className="rounded-xl" />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm">Custom Components</h3>
                <Button type="button" variant="outline" size="sm" className="rounded-xl h-7" onClick={() => setCustomComponents([...customComponents, { name: "", type: "EARNING", amount: 0 }])}>
                  <PlusIcon className="w-3.5 h-3.5 mr-1" /> Add
                </Button>
              </div>
              {customComponents.map((comp, idx) => (
                <div key={idx} className="flex items-end gap-2">
                  <div className="flex-1 space-y-1.5">
                    <Label className="text-xs">Name</Label>
                    <Input type="text" value={comp.name} onChange={e => {
                      const updated = [...customComponents];
                      updated[idx].name = e.target.value;
                      setCustomComponents(updated);
                    }} className="rounded-xl" placeholder="Component name" />
                  </div>
                  <div className="w-36 space-y-1.5">
                    <Label className="text-xs">Type</Label>
                    <Select value={comp.type} onValueChange={(val) => {
                      if (val !== "EARNING" && val !== "DEDUCTION") return;
                      const updated = [...customComponents];
                      updated[idx].type = val;
                      setCustomComponents(updated);
                    }}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EARNING">Earning</SelectItem>
                        <SelectItem value="DEDUCTION">Deduction</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-32 space-y-1.5">
                    <Label className="text-xs">Amount</Label>
                    <Input type="number" min="0" value={comp.amount} onChange={e => {
                      const updated = [...customComponents];
                      updated[idx].amount = Number(e.target.value) || 0;
                      setCustomComponents(updated);
                    }} className="rounded-xl" />
                  </div>
                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-rose-500" onClick={() => setCustomComponents(customComponents.filter((_, i) => i !== idx))}>
                    <TrashIcon className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={onClose} disabled={loading} className="rounded-xl">Cancel</Button>
              <Button onClick={handleSave} disabled={loading || fetching || !!fetchError} className="rounded-xl">
                {loading ? <RefreshCwIcon className="w-4 h-4 mr-2 animate-spin" /> : <SaveIcon className="w-4 h-4 mr-2" />}
                Save Structure
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
