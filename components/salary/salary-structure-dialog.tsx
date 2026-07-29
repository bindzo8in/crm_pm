"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { RefreshCwIcon, SaveIcon } from "lucide-react";

interface SalaryStructureDialogProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
}

export function SalaryStructureDialog({ isOpen, onClose, user }: SalaryStructureDialogProps) {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  
  const [basicSalary, setBasicSalary] = useState("0");
  const [hra, setHra] = useState("0");
  const [conveyance, setConveyance] = useState("0");
  const [medical, setMedical] = useState("0");
  const [specialAllowance, setSpecialAllowance] = useState("0");
  
  const [providentFund, setProvidentFund] = useState("0");
  const [professionalTax, setProfessionalTax] = useState("0");
  const [tds, setTds] = useState("0");

  useEffect(() => {
    if (isOpen) {
      const fetchStructure = async () => {
        setFetching(true);
        try {
          const res = await fetch(`/api/salary/structure?userId=${user.id}`);
          const data = await res.json();
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
          }
        } catch (error) {
          console.error("Failed to fetch structure", error);
        } finally {
          setFetching(false);
        }
      };
      fetchStructure();
    }
  }, [isOpen, user.id]);

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
          customComponents: []
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Salary structure saved successfully.");
        onClose();
      } else {
        toast.error(data.error || "Failed to save structure");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to save structure");
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

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={onClose} disabled={loading} className="rounded-xl">Cancel</Button>
              <Button onClick={handleSave} disabled={loading} className="rounded-xl">
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
