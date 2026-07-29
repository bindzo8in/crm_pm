"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { RefreshCwIcon, CalculatorIcon } from "lucide-react";

interface SalarySlipGenerateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  users: any[];
  onSuccess: (slip: any) => void;
}

export function SalarySlipGenerateDialog({ isOpen, onClose, users, onSuccess }: SalarySlipGenerateDialogProps) {
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string>("");
  
  const currentMonth = new Date().getMonth() + 1; // 1-12
  const currentYear = new Date().getFullYear();
  
  const [month, setMonth] = useState<string>(currentMonth.toString());
  const [year, setYear] = useState<string>(currentYear.toString());
  
  const [medicalReimbursement, setMedicalReimbursement] = useState("0");
  const [extraEarnings, setExtraEarnings] = useState("0");
  const [extraDeductions, setExtraDeductions] = useState("0");

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const handleGenerate = async () => {
    if (!userId) {
      toast.error("Please select an employee");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/salary/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          month: Number(month),
          year: Number(year),
          medicalReimbursement: Number(medicalReimbursement) || 0,
          extraEarnings: Number(extraEarnings) || 0,
          extraDeductions: Number(extraDeductions) || 0,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Salary slip generated successfully.");
        // Add user info back to slip object for UI
        const generatedSlip = data.slip;
        const selectedUser = users.find(u => u.id === userId);
        if (selectedUser) {
          generatedSlip.user = {
            name: selectedUser.name,
            email: selectedUser.email,
            department: selectedUser.department
          };
        }
        onSuccess(generatedSlip);
        onClose();
      } else {
        toast.error(data.error || "Failed to generate slip");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to generate slip");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md bg-background border-border p-6 rounded-3xl">
        <DialogHeader>
          <DialogTitle>Generate Salary Slip</DialogTitle>
          <DialogDescription>Calculate LOP and generate the final salary slip for a month.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Employee</Label>
            <Select value={userId} onValueChange={setUserId}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Select Employee" />
              </SelectTrigger>
              <SelectContent>
                {users.map(u => (
                  <SelectItem key={u.id} value={u.id}>{u.name} ({u.department || 'No Dept'})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Month</Label>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monthNames.map((m, i) => (
                    <SelectItem key={i+1} value={(i+1).toString()}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Year</Label>
              <Input type="number" value={year} onChange={e => setYear(e.target.value)} className="rounded-xl" />
            </div>
          </div>

          <div className="pt-2 border-t mt-4 mb-2">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Adjustments</h3>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Out-of-box Medical Claim / Reimbursement</Label>
                <Input type="number" min="0" value={medicalReimbursement} onChange={e => setMedicalReimbursement(e.target.value)} className="rounded-xl bg-emerald-500/5 border-emerald-500/20" placeholder="e.g. 1500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Other Earnings</Label>
                  <Input type="number" min="0" value={extraEarnings} onChange={e => setExtraEarnings(e.target.value)} className="rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Other Deductions</Label>
                  <Input type="number" min="0" value={extraDeductions} onChange={e => setExtraDeductions(e.target.value)} className="rounded-xl" />
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose} disabled={loading} className="rounded-xl">Cancel</Button>
            <Button onClick={handleGenerate} disabled={loading || !userId} className="rounded-xl font-semibold bg-primary text-primary-foreground">
              {loading ? <RefreshCwIcon className="w-4 h-4 mr-2 animate-spin" /> : <CalculatorIcon className="w-4 h-4 mr-2" />}
              Generate Slip
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
