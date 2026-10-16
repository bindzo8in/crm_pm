"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { cancelLeaveRequestAction } from "@/actions/leave";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function CancelLeaveButton({ id }: { id: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: () => cancelLeaveRequestAction({ id }),
    onSuccess: () => {
      setError(null);
      toast.success("Leave request cancelled.");
      router.refresh();
    },
    onError: (mutationError: Error) => {
      setError(mutationError.message || "Unable to cancel this request.");
    },
  });

  return (
    <div className="space-y-1 text-right">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={mutation.isPending}
        onClick={() => {
          if (window.confirm("Cancel this pending leave request?")) {
            mutation.mutate();
          }
        }}
      >
        {mutation.isPending ? "Cancelling…" : "Cancel"}
      </Button>
      {error && <p role="alert" className="max-w-40 text-xs text-destructive">{error}</p>}
    </div>
  );
}
