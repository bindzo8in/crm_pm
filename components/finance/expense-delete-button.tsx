"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteExpense } from "@/actions/finance";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function ExpenseDeleteButton({ expenseId }: { expenseId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      const result = await deleteExpense(expenseId);
      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success("Expense deleted");
      setOpen(false);
      router.replace("/dashboard/finance");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete this expense.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={(nextOpen) => !deleting && setOpen(nextOpen)}>
      <AlertDialogTrigger asChild>
        <Button type="button" variant="destructive">
          <Trash2 />
          Delete expense
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this expense?</AlertDialogTitle>
          <AlertDialogDescription>
            It will be removed from finance reports and account balance calculations.
            Its record and change history will be retained.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button type="button" variant="outline" disabled={deleting} onClick={() => setOpen(false)}>
            Keep expense
          </Button>
          <Button type="button" variant="destructive" disabled={deleting} onClick={() => void handleDelete()}>
            {deleting ? "Deleting…" : "Delete expense"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
