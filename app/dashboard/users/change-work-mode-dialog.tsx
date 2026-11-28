"use client";

import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldContent,
  FieldLabel,
} from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WorkMode } from "@/app/generated/prisma/enums";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { assignUserWorkMode, type getUsers } from "@/actions/user";

const schema = z.object({
  workMode: z.nativeEnum(WorkMode),
});

type FormValues = z.infer<typeof schema>;
type UserRow = Awaited<ReturnType<typeof getUsers>>["users"][number];

type ChangeWorkModeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: Pick<UserRow, "id" | "name" | "email" | "workMode">;
};

const workModesList = Object.values(WorkMode);

export function ChangeWorkModeDialog({
  open,
  onOpenChange,
  user,
}: ChangeWorkModeDialogProps) {
  const [error, setError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      workMode: user.workMode || WorkMode.OFFICE,
    },
  });

  const queryClient = useQueryClient();
  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) setError(null);
    onOpenChange(nextOpen);
  };

  const mutation = useMutation({
    mutationFn: ({
      userId,
      workMode,
    }: {
      userId: string;
      workMode: WorkMode;
    }) => assignUserWorkMode(userId, workMode),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["organization-users"],
      });
      handleOpenChange(false);
    },
    onError: (error) => {
      setError(error instanceof Error ? error.message : "Failed to update work mode");
    },
  });

  const onSubmit = async (values: FormValues) => {
    if (user.workMode === values.workMode) {
      handleOpenChange(false);
      return;
    }

    mutation.mutate({
      userId: user.id,
      workMode: values.workMode,
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md bg-background border-border p-6 rounded-3xl shadow-2xl">
        {error && (
          <Alert variant="destructive">
            <AlertTitle>Unable to update work mode</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <DialogHeader>
          <DialogTitle>Assign Work Mode</DialogTitle>
          <DialogDescription>
            Assign the attendance work mode for {user.name || user.email}. Only remote/hybrid users can clock in outside the office.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <Field>
            <FieldLabel>Work Mode</FieldLabel>
            <FieldContent>
              <Select
                value={form.watch("workMode")}
                onValueChange={(val) => form.setValue("workMode", val as WorkMode)}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Select work mode" />
                </SelectTrigger>
                <SelectContent>
                  {workModesList.map((mode) => (
                    <SelectItem key={mode} value={mode}>
                      {mode}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldContent>
          </Field>

          <DialogFooter className="flex items-center justify-end gap-2 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              className="rounded-xl"
            >
              Cancel
            </Button>

            <Button
              type="submit"
              disabled={mutation.isPending}
              className="rounded-xl font-semibold"
            >
              {mutation.isPending ? "Updating..." : "Save Work Mode"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
