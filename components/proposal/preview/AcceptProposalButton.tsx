"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { updateProposalStatus } from "@/actions/proposal";
import { publicAcceptProposal } from "@/actions/public-proposal";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface AcceptProposalButtonProps {
  proposalId: string;
  currentStatus: string;
  isPublic?: boolean;
}

export function AcceptProposalButton({ proposalId, currentStatus, isPublic = false }: AcceptProposalButtonProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const router = useRouter();

  const handleAccept = async () => {
    setIsUpdating(true);
    let result;
    if (isPublic) {
      result = await publicAcceptProposal(proposalId);
    } else {
      result = await updateProposalStatus(proposalId, "ACCEPTED");
    }
    
    if (result.success) {
      toast.success("Proposal marked as Accepted!");
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

  if (currentStatus === "ACCEPTED") {
    return (
      <div className="flex justify-center my-8">
        <div className="bg-green-50 text-green-700 px-6 py-4 rounded-xl flex items-center gap-3 border border-green-200 shadow-sm print:hidden">
          <CheckCircle2 className="h-6 w-6" />
          <span className="font-medium text-lg">This proposal has been accepted!</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center my-8 print:hidden">
      <Button 
        onClick={handleAccept} 
        disabled={isUpdating}
        size="lg"
        className="bg-green-600 hover:bg-green-700 text-white px-12 py-6 text-lg rounded-xl shadow-lg transition-transform hover:scale-105"
      >
        <CheckCircle2 className="mr-2 h-6 w-6" />
        {isUpdating ? "Accepting..." : "Accept Proposal"}
      </Button>
    </div>
  );
}
