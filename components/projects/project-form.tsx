"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  ProjectUserPicker,
  type ProjectUserOption,
} from "@/components/projects/project-user-picker";
import {
  convertProposalToProjectAction,
  createProjectAction,
  updateProjectAction,
} from "@/actions/project";
import type { ProjectInput } from "@/lib/schemas/project-schema";

type CustomerOption = {
  id: string;
  displayName: string;
  companyName: string | null;
};

type ProjectFormProps = {
  customers: CustomerOption[];
  initialUsers: ProjectUserOption[];
  initialData?: Partial<ProjectInput> & { projectId?: string };
  customerLocked?: boolean;
  proposal?: {
    id: string;
    proposalCode: string;
    title: string;
    customerId: string;
    customerName: string;
    customerCompanyName: string | null;
    total: number;
    currency: string;
  } | null;
  canManageProjects: boolean;
  canManageTeam: boolean;
  canManageBudget: boolean;
  currentUserId: string;
};

const inputClass =
  "h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50";

export function ProjectForm({
  customers,
  initialUsers,
  initialData,
  customerLocked = false,
  proposal,
  canManageProjects,
  canManageTeam,
  canManageBudget,
  currentUserId,
}: ProjectFormProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [form, setForm] = useState<ProjectInput>({
    name: initialData?.name ?? proposal?.title ?? "",
    customerId: initialData?.customerId ?? proposal?.customerId ?? null,
    proposalId: proposal?.id ?? null,
    description: initialData?.description ?? "",
    objectives: initialData?.objectives ?? "",
    scope: initialData?.scope ?? "",
    internalNotes: initialData?.internalNotes ?? "",
    projectManagerId: initialData
      ? initialData.projectManagerId ?? null
      : canManageTeam ? currentUserId : null,
    teamMemberIds: initialData?.teamMemberIds ?? [],
    startDate: initialData?.startDate ?? "",
    dueDate: initialData?.dueDate ?? "",
    priority: initialData?.priority ?? "MEDIUM",
    status: initialData?.status === "NOT_STARTED" ? "NOT_STARTED" : "PLANNING",
    budgetAmount: initialData?.budgetAmount ?? undefined,
    currency: initialData?.currency ?? (proposal?.currency === "USD" ? "USD" : "INR"),
  });
  const [selectedManager, setSelectedManager] = useState<ProjectUserOption | null>(
    initialUsers.find(({ id }) => id === (
      initialData
        ? initialData.projectManagerId ?? null
        : canManageTeam ? currentUserId : null
    )) ?? null,
  );
  const [selectedMembers, setSelectedMembers] = useState<ProjectUserOption[]>(
    initialUsers.filter(({ id }) => initialData?.teamMemberIds?.includes(id)),
  );

  function updateField<K extends keyof ProjectInput>(key: K, value: ProjectInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    try {
      const { projectManagerId, teamMemberIds, budgetAmount, ...sharedFields } = form;
      const response = initialData?.projectId
        ? await updateProjectAction({
            ...sharedFields,
            projectId: initialData.projectId,
            ...(canManageTeam ? { projectManagerId, teamMemberIds } : {}),
            ...(canManageBudget ? { budgetAmount } : {}),
          })
        : proposal
          ? await convertProposalToProjectAction(proposal.id, form)
          : await createProjectAction(form);

      if (!response.success || !response.data) {
        toast.error(response.message);
        return;
      }
      toast.success(response.message);
      router.push(`/dashboard/projects/${response.data.id}`);
      router.refresh();
    } catch (error) {
      console.error("Failed to save project", error);
      toast.error("Unable to save project. Try again.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto w-full max-w-5xl space-y-5">
      {proposal && (
        <aside className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm">
          <div className="font-semibold">Converting {proposal.proposalCode}</div>
          <div className="mt-1 text-muted-foreground">
            {proposal.customerName}
            {proposal.customerCompanyName ? ` · ${proposal.customerCompanyName}` : ""}
            {" · "}
            {proposal.currency} {proposal.total.toLocaleString("en-IN")}
          </div>
          <p className="mt-2 text-muted-foreground">
            The accepted proposal remains unchanged and will be linked to this project.
          </p>
        </aside>
      )}

      <section className="rounded-xl border bg-card p-4 shadow-sm sm:p-6">
        <div className="mb-5">
          <h2 className="text-lg font-semibold">Project details</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Define the work, customer, and delivery timeline.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-1.5 text-sm font-medium md:col-span-2">
            Project name
            <Input
              required
              maxLength={160}
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
              placeholder="For example, Customer portal implementation"
            />
          </label>

          <label className="grid gap-1.5 text-sm font-medium md:col-span-2">
            Customer
            <select
              className={inputClass}
              value={form.customerId ?? ""}
              disabled={customerLocked}
              onChange={(event) => updateField("customerId", event.target.value || null)}
            >
              <option value="">No customer (standalone project)</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.displayName}{customer.companyName ? ` — ${customer.companyName}` : ""}
                </option>
              ))}
            </select>
            <span className="font-normal text-muted-foreground">
              Customer details are linked, not copied into the project.
            </span>
          </label>

          <label className="grid gap-1.5 text-sm font-medium md:col-span-2">
            Description
            <Textarea
              rows={3}
              maxLength={5000}
              value={form.description ?? ""}
              onChange={(event) => updateField("description", event.target.value)}
              placeholder="A short summary of the work"
            />
          </label>

          <label className="grid gap-1.5 text-sm font-medium md:col-span-2">
            Objectives
            <Textarea
              rows={3}
              maxLength={5000}
              value={form.objectives ?? ""}
              onChange={(event) => updateField("objectives", event.target.value)}
              placeholder="What should this project achieve?"
            />
          </label>

          <label className="grid gap-1.5 text-sm font-medium md:col-span-2">
            Scope and deliverables
            <Textarea
              rows={5}
              maxLength={15000}
              value={form.scope ?? ""}
              onChange={(event) => updateField("scope", event.target.value)}
              placeholder="List the work and expected deliverables"
            />
          </label>
        </div>
      </section>

      <section className="rounded-xl border bg-card p-4 shadow-sm sm:p-6">
        <div className="mb-5">
          <h2 className="text-lg font-semibold">Ownership and schedule</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Assign the people responsible and set target dates.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {canManageTeam && (
            <>
              <ProjectUserPicker
                label="Project manager"
                initialUsers={initialUsers}
                selectedUsers={selectedManager ? [selectedManager] : []}
                onSelectionChange={(users) => {
                  const manager = users[0] ?? null;
                  setSelectedManager(manager);
                  updateField("projectManagerId", manager?.id ?? null);
                  if (manager) {
                    const members = selectedMembers.filter(({ id }) => id !== manager.id);
                    setSelectedMembers(members);
                    updateField("teamMemberIds", members.map(({ id }) => id));
                  }
                }}
              />
              <ProjectUserPicker
                label="Team members"
                initialUsers={initialUsers}
                selectedUsers={selectedMembers}
                multiple
                excludedUserId={form.projectManagerId}
                onSelectionChange={(members) => {
                  setSelectedMembers(members);
                  updateField("teamMemberIds", members.map(({ id }) => id));
                }}
              />
            </>
          )}
          <label className="grid gap-1.5 text-sm font-medium">
            Start date
            <Input
              type="date"
              value={form.startDate ?? ""}
              onChange={(event) => updateField("startDate", event.target.value)}
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Target completion
            <Input
              type="date"
              value={form.dueDate ?? ""}
              onChange={(event) => updateField("dueDate", event.target.value)}
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Priority
            <select
              className={inputClass}
              value={form.priority}
              onChange={(event) => updateField("priority", event.target.value as ProjectInput["priority"])}
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </label>
          {!initialData?.projectId && (
            <label className="grid gap-1.5 text-sm font-medium">
              Initial status
              <select
                className={inputClass}
                value={form.status}
                onChange={(event) => updateField("status", event.target.value as ProjectInput["status"])}
              >
                <option value="PLANNING">Planning</option>
                <option value="NOT_STARTED">Not started</option>
              </select>
            </label>
          )}
          {canManageBudget && (
            <div className="grid grid-cols-[minmax(0,1fr)_110px] gap-3 md:col-span-2">
              <label className="grid gap-1.5 text-sm font-medium">
                Planned budget
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.budgetAmount ?? ""}
                  onChange={(event) => updateField(
                    "budgetAmount",
                    event.target.value === "" ? undefined : Number(event.target.value),
                  )}
                  placeholder="Optional"
                />
              </label>
              <label className="grid gap-1.5 text-sm font-medium">
                Currency
                <select
                  className={inputClass}
                  value={form.currency}
                  onChange={(event) => updateField("currency", event.target.value as ProjectInput["currency"])}
                >
                  <option value="INR">INR</option>
                  <option value="USD">USD</option>
                </select>
              </label>
            </div>
          )}
          {canManageProjects && (
            <label className="grid gap-1.5 text-sm font-medium md:col-span-2">
              Internal notes
              <Textarea
                rows={3}
                maxLength={5000}
                value={form.internalNotes ?? ""}
                onChange={(event) => updateField("internalNotes", event.target.value)}
                placeholder="Visible to authorized CRM users only"
              />
            </label>
          )}
        </div>
      </section>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={isPending}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending
            ? "Saving…"
            : proposal
              ? "Convert to Project"
              : initialData?.projectId
                ? "Save changes"
                : "Create project"}
        </Button>
      </div>
    </form>
  );
}
