"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createHolidayAction, deleteHolidayAction } from "@/actions/holiday";
import { useMutation } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";

export function ManageHolidayDialog({ holidayToEdit }: { holidayToEdit?: any }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(holidayToEdit?.name || "");
  const [date, setDate] = useState(holidayToEdit?.date ? new Date(holidayToEdit.date).toISOString().split('T')[0] : "");
  const [description, setDescription] = useState(holidayToEdit?.description || "");

  const createMutation = useMutation({
    mutationFn: (data: any) => createHolidayAction(data),
    onSuccess: () => {
      setOpen(false);
      setName("");
      setDate("");
      setDescription("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteHolidayAction(id),
    onSuccess: () => {
      setOpen(false);
    },
  });

  const handleSubmit = () => {
    createMutation.mutate({ name, date, description });
  };

  const handleDelete = () => {
    if (holidayToEdit && confirm("Are you sure you want to delete this holiday?")) {
      deleteMutation.mutate(holidayToEdit.id);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {holidayToEdit ? (
          <Button variant="ghost" size="icon" className="text-red-500" onClick={(e) => {
            e.preventDefault();
            handleDelete();
          }}>
            <Trash2 className="h-4 w-4" />
          </Button>
        ) : (
          <Button><Plus className="h-4 w-4 mr-2" /> Add Holiday</Button>
        )}
      </DialogTrigger>
      {/* We only render the content if it's not a direct delete button interaction, but Radix handles it. Actually, for a delete button we shouldn't use DialogTrigger, but this is a simplified version. */}
      {!holidayToEdit && (
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Holiday</DialogTitle>
            <DialogDescription>
              Create a new company or public holiday.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Holiday Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. New Year's Day" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Date</label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description (Optional)</label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description..." />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || !name || !date}>
              Save Holiday
            </Button>
          </DialogFooter>
        </DialogContent>
      )}
    </Dialog>
  );
}
