"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { publicAcceptProposal } from "@/actions/public-proposal";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ClientSignatureInput,
  type ClientSignatureData,
} from "./client-signature-input";

interface AcceptProposalButtonProps {
  proposalId: string;
  currentStatus: string;
}

export function AcceptProposalButton({ proposalId, currentStatus }: AcceptProposalButtonProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [signatureData, setSignatureData] = useState<ClientSignatureData | null>(null);
  const router = useRouter();

  const handleAccept = async () => {
    if (!termsAccepted || !signatureData) return;

    setIsUpdating(true);
    try {
      const result = await publicAcceptProposal(proposalId, signatureData, termsAccepted);
      if (result.success) {
        toast.success("Proposal accepted");
        setIsDialogOpen(false);
        setTermsAccepted(false);
        setSignatureData(null);
        router.refresh();
      } else {
        toast.error(result.message || "Failed to accept proposal");
      }
    } catch (error) {
      console.error("Failed to accept public proposal:", error);
      toast.error("Failed to accept proposal");
    } finally {
      setIsUpdating(false);
    }
  };

  if (currentStatus === "ACCEPTED") {
    return (
      <div className="flex flex-col items-center gap-3 my-8 print:hidden">
        <div className="bg-green-50 text-green-700 px-6 py-4 rounded-xl flex items-center gap-3 border border-green-200 shadow-sm">
          <CheckCircle2 className="h-6 w-6" />
          <span className="font-medium text-lg">This proposal has been accepted!</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center my-8 print:hidden">
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button 
            size="lg"
            className="bg-green-600 hover:bg-green-700 text-white px-12 py-6 text-lg rounded-xl shadow-lg transition-transform hover:scale-105"
          >
            <CheckCircle2 className="mr-2 h-6 w-6" />
            Accept Proposal
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Accept Proposal</DialogTitle>
            <DialogDescription>
              Please provide your signature and agree to the terms to formally accept this proposal.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <p className="text-sm font-medium">Choose how to sign</p>
              <ClientSignatureInput
                proposalId={proposalId}
                value={signatureData}
                onChange={setSignatureData}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox 
                id="terms" 
                checked={termsAccepted}
                onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
              />
              <label
                htmlFor="terms"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                I have authority to sign and agree to this proposal. My signature records this acceptance.
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button 
              onClick={handleAccept} 
              disabled={isUpdating || !termsAccepted || !signatureData}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {isUpdating ? "Accepting..." : "Confirm & Accept"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
