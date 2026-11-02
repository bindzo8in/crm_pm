"use client";

import { useState } from "react";
import { UpdateServiceProposalVisibility } from "@/actions/services";
import { Switch } from "@/components/ui/switch";
import { serviceKeys } from "@/components/services/util";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface ProposalVisibilitySwitchProps {
  id: string;
  serviceName: string;
  showInProposal: boolean;
}

export function ProposalVisibilitySwitch({
  id,
  serviceName,
  showInProposal,
}: ProposalVisibilitySwitchProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const queryClient = useQueryClient();

  const handleChange = async (nextValue: boolean) => {
    if (isUpdating || nextValue === showInProposal) return;
    setIsUpdating(true);

    try {
      const result = await UpdateServiceProposalVisibility({
        id,
        showInProposal: nextValue,
      });

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      await queryClient.invalidateQueries({ queryKey: serviceKeys.all });
    } catch (error) {
      console.error("Failed to update proposal service visibility:", error);
      toast.error("Could not update Core Services visibility");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Switch
        checked={showInProposal}
        onCheckedChange={handleChange}
        disabled={isUpdating}
        aria-label={`${showInProposal ? "Hide" : "Show"} ${serviceName} in proposal Core Services`}
      />
      <span className="text-sm text-muted-foreground" aria-live="polite">
        {showInProposal ? "Shown" : "Hidden"}
      </span>
    </div>
  );
}
