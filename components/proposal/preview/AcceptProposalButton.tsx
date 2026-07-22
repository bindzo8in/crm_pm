"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ReceiptText, Loader2 } from "lucide-react";
import { updateProposalStatus } from "@/actions/proposal";
import { createInvoiceFromProposal } from "@/actions/invoice";
import { publicAcceptProposal } from "@/actions/public-proposal";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { ImageUpload } from "@/components/ui/image-upload";

interface AcceptProposalButtonProps {
  proposalId: string;
  currentStatus: string;
  isPublic?: boolean;
}

export function AcceptProposalButton({ proposalId, currentStatus, isPublic = false }: AcceptProposalButtonProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [signatureData, setSignatureData] = useState<{ url: string; publicId: string } | null>(null);
  
  const router = useRouter();

  const handleAccept = async () => {
    if (!termsAccepted || !signatureData) return;

    setIsUpdating(true);
    let result;
    if (isPublic) {
      result = await publicAcceptProposal(proposalId, signatureData);
    } else {
      result = await updateProposalStatus(proposalId, "ACCEPTED");
    }
    
    if (result.success) {
      toast.success("Proposal marked as Accepted!");
      setIsDialogOpen(false);
      router.refresh();
    } else {
      if ('error' in result && typeof result.error === 'string') {
        toast.error(result.error);
      } else if ('message' in result && typeof result.message === 'string') {
        toast.error(result.message);
      } else {
        toast.error("Failed to update proposal status");
      }
    }
    
    setIsUpdating(false);
  };

  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateInvoice = async () => {
    try {
      setIsGenerating(true);
      const res = await createInvoiceFromProposal(proposalId);
      if (res.success && res.data) {
        toast.success(res.message || "Invoice ready!");
        router.push(`/dashboard/invoices/${res.data.id}`);
      } else {
        toast.error(res.message || "Failed to generate invoice");
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to generate invoice");
    } finally {
      setIsGenerating(false);
    }
  };

  if (currentStatus === "ACCEPTED") {
    return (
      <div className="flex flex-col items-center gap-3 my-8 print:hidden">
        <div className="bg-green-50 text-green-700 px-6 py-4 rounded-xl flex items-center gap-3 border border-green-200 shadow-sm">
          <CheckCircle2 className="h-6 w-6" />
          <span className="font-medium text-lg">This proposal has been accepted!</span>
        </div>
        {!isPublic && (
          <Button
            onClick={handleGenerateInvoice}
            disabled={isGenerating}
            size="lg"
            className="gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow px-8"
          >
            {isGenerating ? <Loader2 className="h-5 w-5 animate-spin" /> : <ReceiptText className="h-5 w-5" />}
            {isGenerating ? "Generating Invoice..." : "Generate Invoice"}
          </Button>
        )}
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

          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Client Signature
              </label>
              <ImageUpload
                value={signatureData}
                onChange={(data) => setSignatureData(data)}
              />
              <p className="text-xs text-muted-foreground">Upload an image of your signature or stamp.</p>
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
                I have read all documents and agree to the terms and conditions.
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
