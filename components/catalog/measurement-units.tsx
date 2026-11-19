"use client";

import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/lib/auth-client";
import {
  createMeasurementUnit,
  deleteMeasurementUnit,
  getMeasurementUnits,
  updateMeasurementUnit,
} from "@/actions/measurement-units";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import {
  getUqcDescription,
  UQC_OPTIONS,
} from "@/lib/measurement-units";
import { toast } from "sonner";
import { Check, LoaderCircle, Pencil, Plus, Search, Settings2, Trash2, X } from "lucide-react";

const measurementUnitsQueryKey = ["measurement-units"] as const;

function useMeasurementUnitCatalog() {
  const { data: session, isPending: isSessionPending } = useSession();
  const organizationId = session?.session.activeOrganizationId ?? null;

  return useQuery({
    queryKey: [...measurementUnitsQueryKey, organizationId],
    queryFn: async () => {
      const response = await getMeasurementUnits();
      if (!response.success) throw new Error(response.message);
      if (!response.data) throw new Error("Measurement units were not returned");
      return response.data;
    },
    enabled: Boolean(organizationId) && !isSessionPending,
    staleTime: 60_000,
  });
}

function UqcSelector({
  value,
  onChange,
  id,
}: {
  value: string | null;
  onChange: (value: string | null) => void;
  id: string;
}) {
  return (
    <Select
      value={value ?? "none"}
      onValueChange={(next) => onChange(next === "none" ? null : next)}
    >
      <SelectTrigger id={id} aria-label="UQC code">
        <SelectValue placeholder="No UQC" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>GST quantity codes</SelectLabel>
          <SelectItem value="none">No UQC</SelectItem>
          {UQC_OPTIONS.map(({ code, description }) => (
            <SelectItem key={code} value={code}>
              <span className="font-medium">{code}</span>
              <span className="text-muted-foreground">{description}</span>
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

function MeasurementUnitManager() {
  const queryClient = useQueryClient();
  const catalogQuery = useMeasurementUnitCatalog();
  const [search, setSearch] = useState("");
  const [newName, setNewName] = useState("");
  const [newUqcCode, setNewUqcCode] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editUqcCode, setEditUqcCode] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const units = catalogQuery.data?.units ?? [];
  const visibleUnits = units.filter((unit) => {
    const text = `${unit.name} ${unit.uqcCode ?? ""} ${getUqcDescription(unit.uqcCode) ?? ""}`;
    return text.toLocaleLowerCase().includes(search.toLocaleLowerCase());
  });

  const refreshUnits = async () => {
    await queryClient.invalidateQueries({ queryKey: measurementUnitsQueryKey });
  };

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    try {
      const response = await createMeasurementUnit({
        name: newName,
        uqcCode: newUqcCode,
      });
      if (!response.success) {
        toast.error(response.message);
        return;
      }

      toast.success(response.message);
      setNewName("");
      setNewUqcCode(null);
      await refreshUnits();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Measurement unit could not be added");
    } finally {
      setBusy(false);
    }
  };

  const startEditing = (unit: (typeof units)[number]) => {
    setEditingId(unit.id);
    setEditName(unit.name);
    setEditUqcCode(unit.uqcCode);
  };

  const handleUpdate = async (id: string) => {
    setBusy(true);
    try {
      const response = await updateMeasurementUnit({
        id,
        name: editName,
        uqcCode: editUqcCode,
      });
      if (!response.success) {
        toast.error(response.message);
        return;
      }

      toast.success(response.message);
      setEditingId(null);
      await refreshUnits();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Measurement unit could not be updated");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    setBusy(true);
    try {
      const response = await deleteMeasurementUnit({ id: pendingDelete.id });
      if (!response.success) {
        toast.error(response.message);
        return;
      }

      toast.success(response.message);
      setPendingDelete(null);
      await refreshUnits();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Measurement unit could not be deleted");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <SheetContent side="right" className="w-full gap-0 sm:max-w-2xl">
        <SheetHeader className="border-b px-5 py-5">
          <SheetTitle>Measurement units</SheetTitle>
          <SheetDescription>
            Keep units consistent across products, packages, proposals, and invoices.
            Existing documents keep their saved unit values.
          </SheetDescription>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-5 py-5">
          <form onSubmit={handleCreate} className="border-b pb-5">
            <FieldGroup className="grid items-end gap-3 sm:grid-cols-[minmax(0,1fr)_12rem_auto]">
              <Field>
                <FieldLabel htmlFor="new-measurement-unit">Unit name</FieldLabel>
                <Input
                  id="new-measurement-unit"
                  value={newName}
                  onChange={(event) => setNewName(event.target.value)}
                  maxLength={40}
                  placeholder="e.g. hour"
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="new-measurement-uqc">UQC code</FieldLabel>
                <UqcSelector
                  id="new-measurement-uqc"
                  value={newUqcCode}
                  onChange={setNewUqcCode}
                />
              </Field>
              <Button type="submit" disabled={busy || !newName.trim()}>
                {busy ? <LoaderCircle data-icon="inline-start" className="animate-spin" /> : <Plus data-icon="inline-start" />}
                Add unit
              </Button>
            </FieldGroup>
            <p className="mt-2 text-xs text-muted-foreground">
              UQC is optional. Confirm the current GST portal list before using a code for filing.
            </p>
          </form>

          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold">Available units</h3>
              <p className="text-xs text-muted-foreground">{units.length} units in this organization</p>
            </div>
            <div className="relative w-full max-w-56">
              <Search aria-hidden="true" className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="Search measurement units"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search units"
                className="pl-8"
              />
            </div>
          </div>

          {catalogQuery.isPending ? (
            <p className="text-sm text-muted-foreground">Loading measurement units…</p>
          ) : catalogQuery.isError ? (
            <div role="alert" className="flex flex-col items-start gap-2 text-sm text-destructive">
              <p>{catalogQuery.error.message}</p>
              <Button type="button" variant="outline" size="sm" onClick={() => void catalogQuery.refetch()}>
                Try again
              </Button>
            </div>
          ) : visibleUnits.length === 0 ? (
            <p className="rounded-md border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
              No units match this search.
            </p>
          ) : (
            <ul className="divide-y">
              {visibleUnits.map((unit) => (
                <li key={unit.id} className="grid gap-3 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                  {editingId === unit.id ? (
                    <>
                      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_12rem]">
                        <Field>
                          <FieldLabel className="sr-only" htmlFor={`edit-unit-${unit.id}`}>Unit name</FieldLabel>
                          <Input
                            id={`edit-unit-${unit.id}`}
                            value={editName}
                            onChange={(event) => setEditName(event.target.value)}
                            maxLength={40}
                          />
                        </Field>
                        <Field>
                          <FieldLabel className="sr-only" htmlFor={`edit-unit-uqc-${unit.id}`}>UQC code</FieldLabel>
                          <UqcSelector
                            id={`edit-unit-uqc-${unit.id}`}
                            value={editUqcCode}
                            onChange={setEditUqcCode}
                          />
                        </Field>
                      </div>
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => void handleUpdate(unit.id)}
                          disabled={busy || !editName.trim()}
                          aria-label={`Save ${unit.name}`}
                        >
                          {busy ? <LoaderCircle data-icon="inline-start" className="animate-spin" /> : <Check data-icon="inline-start" />}
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => setEditingId(null)}
                          disabled={busy}
                          aria-label={`Cancel editing ${unit.name}`}
                        >
                          <X data-icon="inline-start" />
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="truncate text-sm font-medium">{unit.name}</span>
                        {unit.uqcCode ? (
                          <Badge variant="outline">{unit.uqcCode}</Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">No UQC</span>
                        )}
                        {unit.uqcCode && (
                          <span className="text-xs text-muted-foreground">
                            {getUqcDescription(unit.uqcCode)}
                          </span>
                        )}
                      </div>
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => startEditing(unit)}
                          disabled={busy}
                          aria-label={`Edit ${unit.name}`}
                        >
                          <Pencil data-icon="inline-start" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => setPendingDelete({ id: unit.id, name: unit.name })}
                          disabled={busy}
                          aria-label={`Delete ${unit.name}`}
                        >
                          <Trash2 data-icon="inline-start" />
                        </Button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </SheetContent>

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open && !busy) setPendingDelete(null);
        }}
        title={`Delete ${pendingDelete?.name ?? "unit"}?`}
        description="Units already used by products, packages, proposals, or invoices cannot be deleted."
        confirmLabel="Delete unit"
        disabled={busy}
        onConfirm={() => void handleDelete()}
      />
    </>
  );
}

export function UnitCatalogManagerTrigger() {
  const catalogQuery = useMeasurementUnitCatalog();
  const [open, setOpen] = useState(false);

  if (!catalogQuery.data?.canManage) return null;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
      >
        <Settings2 data-icon="inline-start" />
        Manage units
      </Button>
      {open && <MeasurementUnitManager />}
    </Sheet>
  );
}

export function UnitSelect({
  id,
  value,
  onValueChange,
  disabled,
  invalid,
  showManage = false,
  placeholder = "Select unit",
}: {
  id: string;
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  invalid?: boolean;
  showManage?: boolean;
  placeholder?: string;
}) {
  const catalogQuery = useMeasurementUnitCatalog();
  const units = catalogQuery.data?.units ?? [];
  const hasCurrentUnit = value.length > 0 && units.some((unit) => unit.name === value);
  const selectedLegacyUnit = value && !hasCurrentUnit;

  return (
    <div className="flex min-w-0 items-center gap-2">
      <Select
        value={value || undefined}
        onValueChange={onValueChange}
        disabled={disabled || catalogQuery.isPending || catalogQuery.isError}
      >
        <SelectTrigger id={id} aria-invalid={invalid} className="min-w-0 flex-1">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {selectedLegacyUnit && (
            <SelectGroup>
              <SelectLabel>Existing value</SelectLabel>
              <SelectItem value={value}>{value} · Saved value</SelectItem>
            </SelectGroup>
          )}
          <SelectGroup>
            <SelectLabel>Measurement units</SelectLabel>
            {units.map((unit) => (
              <SelectItem key={unit.id} value={unit.name}>
                <span>{unit.name}</span>
                {unit.uqcCode && (
                  <span className="text-muted-foreground">
                    {unit.uqcCode} · {getUqcDescription(unit.uqcCode)}
                  </span>
                )}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>

      {showManage && catalogQuery.data?.canManage && (
        <UnitCatalogManagerTrigger />
      )}

      {catalogQuery.isError && (
        <span role="alert" className="text-xs text-destructive">
          Units could not be loaded.
        </span>
      )}
    </div>
  );
}
