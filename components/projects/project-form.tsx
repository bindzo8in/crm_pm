"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  CustomerCombobox,
  type CustomerOption,
} from "@/components/customers/customer-combobox";
import { CustomerForm } from "@/components/customers/create-edit";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ProjectUserPicker,
  type ProjectUserOption,
} from "@/components/projects/project-user-picker";
import {
  BriefcaseBusiness,
  CalendarDays,
  CircleDollarSign,
  ClipboardList,
  FileText,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import {
  type MultiSelectOption,
} from "@/components/ui/multi-select";
import { OptionSelect } from "@/components/ui/option-select";
import {
  convertProposalToProjectAction,
  createProjectAction,
  updateProjectAction,
} from "@/actions/project";
import type { ProjectInput } from "@/lib/schemas/project-schema";

type ProjectFormProps = {
  initialCustomer: CustomerOption | null;
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

const projectPriorityOptions: MultiSelectOption[] = [
  { value: "LOW", label: "Low", icon: "flag" },
  { value: "MEDIUM", label: "Medium", icon: "flag" },
  { value: "HIGH", label: "High", icon: "flag" },
  { value: "URGENT", label: "Urgent", icon: "overdue" },
];

export function ProjectForm({
  initialCustomer,
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
  const [createCustomerOpen, setCreateCustomerOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(initialCustomer);
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
  const initialStatusOptions: MultiSelectOption[] = [
    { value: "PLANNING", label: "Planning", icon: "planning" },
    { value: "NOT_STARTED", label: "Not started", icon: "notStarted" },
  ];
  const sections: { id: string; label: string; icon: LucideIcon }[] = [
    { id: "project-basics", label: "Project basics", icon: BriefcaseBusiness },
    { id: "project-delivery", label: "Scope & delivery", icon: ClipboardList },
    { id: "project-ownership", label: "People & resources", icon: UsersRound },
  ];

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
    <form
      onSubmit={handleSubmit}
      className="grid w-full grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)]"
    >
      <aside className="hidden border-r lg:block">
        <nav aria-label="Project form sections" className="sticky top-6 space-y-1 py-8 pr-5">
          <p className="mb-3 px-3 text-xs font-medium text-muted-foreground">Sections</p>
          {sections.map(({ id, label, icon: SectionIcon }) => (
            <a
              key={id}
              href={`#${id}`}
              className="flex min-h-10 items-center gap-2.5 rounded-md px-3 text-sm text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              <SectionIcon aria-hidden="true" className="size-4" />
              {label}
            </a>
          ))}
          {proposal && (
            <div className="mt-8 border-t px-3 pt-5">
              <p className="flex items-center gap-2 text-sm font-medium">
                <FileText aria-hidden="true" className="size-4 text-primary" />
                {proposal.proposalCode}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {proposal.customerName}
                {proposal.customerCompanyName ? ` · ${proposal.customerCompanyName}` : ""}
              </p>
              <p className="mt-1 text-sm font-medium">
                {proposal.currency} {proposal.total.toLocaleString("en-IN")}
              </p>
              <p className="mt-3 text-xs leading-5 text-muted-foreground">
                The accepted proposal stays unchanged and will be linked to this project.
              </p>
            </div>
          )}
        </nav>
      </aside>

      <div className="min-w-0 px-4 sm:px-7 lg:px-10">
        <header className="border-b py-7 sm:py-9">
          <p className="text-sm font-medium text-primary">
            {proposal ? `From accepted proposal ${proposal.proposalCode}` : initialData?.projectId ? "Project details" : "Project setup"}
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
            {proposal ? "Create this project from its proposal" : initialData?.projectId ? "Update the project brief" : "Set up the project brief"}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Capture the brief, delivery plan, and resources in one place. You can refine these details later.
          </p>
          {proposal && (
            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-l-2 border-primary/50 pl-3 text-sm">
              <span className="font-medium">{proposal.customerName}</span>
              <span className="text-muted-foreground">
                Proposal value: {proposal.currency} {proposal.total.toLocaleString("en-IN")}
              </span>
              <span className="text-muted-foreground">Proposal details remain unchanged.</span>
            </div>
          )}
        </header>

        <section
          id="project-basics"
          className="grid gap-4 border-b py-7 sm:py-9 lg:grid-cols-[minmax(180px,0.7fr)_minmax(0,1.8fr)] lg:gap-10"
        >
          <div>
            <h2 className="text-base font-semibold">Project basics</h2>
            <p className="mt-1.5 max-w-xs text-sm leading-5 text-muted-foreground">
              Give the work a clear name and connect it to a customer.
            </p>
          </div>
          <div className="grid content-start gap-5 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-medium sm:col-span-2">
              Project name <span className="text-destructive">*</span>
              <Input
                required
                maxLength={160}
                value={form.name}
                onChange={(event) => updateField("name", event.target.value)}
                placeholder="For example, Customer portal implementation"
                className="h-11"
              />
            </label>
            <div className="grid gap-1.5 text-sm font-medium sm:col-span-2">
              <span>Customer</span>
              <CustomerCombobox
                id="project-customer"
                aria-label="Customer"
                value={form.customerId ?? ""}
                selectedCustomer={selectedCustomer}
                disabled={customerLocked}
                allowNoCustomer
                placeholder="No customer (standalone project)"
                onCreateCustomer={() => setCreateCustomerOpen(true)}
                onClear={() => {
                  setSelectedCustomer(null);
                  updateField("customerId", null);
                }}
                onValueChange={(customer) => {
                  setSelectedCustomer(customer);
                  updateField("customerId", customer.id);
                }}
              />
              <span className="text-xs font-normal text-muted-foreground">
                Search existing customers or add one without leaving this form. Leave it unassigned for a standalone project.
              </span>
            </div>
            <label className="grid gap-1.5 text-sm font-medium sm:col-span-2">
              Short description
              <Textarea
                rows={3}
                maxLength={5000}
                value={form.description ?? ""}
                onChange={(event) => updateField("description", event.target.value)}
                placeholder="What is this project about?"
              />
            </label>
          </div>
        </section>

        <section
          id="project-delivery"
          className="grid gap-4 border-b py-7 sm:py-9 lg:grid-cols-[minmax(180px,0.7fr)_minmax(0,1.8fr)] lg:gap-10"
        >
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <CalendarDays aria-hidden="true" className="size-4 text-muted-foreground" />
              Scope & delivery
            </h2>
            <p className="mt-1.5 max-w-xs text-sm leading-5 text-muted-foreground">
              Set the intended outcome, work boundaries, and delivery dates.
            </p>
          </div>
          <div className="grid content-start gap-5 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-medium sm:col-span-2">
              Objectives
              <Textarea
                rows={3}
                maxLength={5000}
                value={form.objectives ?? ""}
                onChange={(event) => updateField("objectives", event.target.value)}
                placeholder="What should this project achieve?"
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium sm:col-span-2">
              Scope and deliverables
              <Textarea
                rows={4}
                maxLength={15000}
                value={form.scope ?? ""}
                onChange={(event) => updateField("scope", event.target.value)}
                placeholder="List the work and expected deliverables"
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Start date
              <Input
                type="date"
                value={form.startDate ?? ""}
                onChange={(event) => updateField("startDate", event.target.value)}
                className="h-11"
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Target completion
              <Input
                type="date"
                value={form.dueDate ?? ""}
                onChange={(event) => updateField("dueDate", event.target.value)}
                className="h-11"
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Priority
              <OptionSelect
                label="Priority"
                value={form.priority}
                onValueChange={(value) => {
                  if (value === "LOW" || value === "MEDIUM" || value === "HIGH" || value === "URGENT") {
                    updateField("priority", value);
                  }
                }}
                options={projectPriorityOptions}
                className="h-11"
              />
            </label>
            {!initialData?.projectId && (
              <label className="grid gap-1.5 text-sm font-medium">
                Initial status
                <OptionSelect
                  label="Initial status"
                  value={form.status}
                  onValueChange={(value) => {
                    if (value === "PLANNING" || value === "NOT_STARTED") updateField("status", value);
                  }}
                  options={initialStatusOptions}
                  className="h-11"
                />
              </label>
            )}
          </div>
        </section>

        <section
          id="project-ownership"
          className="grid gap-4 py-7 sm:py-9 lg:grid-cols-[minmax(180px,0.7fr)_minmax(0,1.8fr)] lg:gap-10"
        >
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <UsersRound aria-hidden="true" className="size-4 text-muted-foreground" />
              People & resources
            </h2>
            <p className="mt-1.5 max-w-xs text-sm leading-5 text-muted-foreground">
              Assign ownership and add financial context for the team.
            </p>
          </div>
          <div className="grid content-start gap-5 sm:grid-cols-2">
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
            {canManageBudget && (
              <>
                <label className="grid gap-1.5 text-sm font-medium">
                  <span className="flex items-center gap-1.5">
                    <CircleDollarSign aria-hidden="true" className="size-4 text-muted-foreground" />
                    Planned budget
                  </span>
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
                    className="h-11"
                  />
                </label>
                <label className="grid gap-1.5 text-sm font-medium">
                  Currency
                  <OptionSelect
                    label="Currency"
                    value={form.currency}
                    onValueChange={(value) => {
                      if (value === "INR" || value === "USD") updateField("currency", value);
                    }}
                    options={[
                      { value: "INR", label: "INR", icon: "flag" },
                      { value: "USD", label: "USD", icon: "flag" },
                    ]}
                    className="h-11"
                  />
                </label>
              </>
            )}
            {canManageProjects && (
              <label className="grid gap-1.5 text-sm font-medium sm:col-span-2">
                Internal notes
                <Textarea
                  rows={3}
                  maxLength={5000}
                  value={form.internalNotes ?? ""}
                  onChange={(event) => updateField("internalNotes", event.target.value)}
                  placeholder="Only authorized CRM users can see these notes."
                />
              </label>
            )}
            {!canManageTeam && !canManageBudget && !canManageProjects && (
              <p className="text-sm text-muted-foreground">
                Project ownership and budget can be managed by an administrator.
              </p>
            )}
          </div>
        </section>
      </div>

      <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] z-10 col-span-full flex flex-col-reverse gap-3 border-t bg-background/95 px-4 py-3 backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:px-7 md:bottom-0 lg:px-10">
        <p className="hidden text-sm text-muted-foreground sm:block">
          {proposal ? "The accepted proposal will remain unchanged." : "You can update this information later."}
        </p>
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <Button type="button" variant="outline" onClick={() => router.back()} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending
              ? "Saving…"
              : proposal
                ? "Convert to project"
                : initialData?.projectId
                  ? "Save changes"
                  : "Create project"}
          </Button>
        </div>
      </div>
      <Dialog open={createCustomerOpen} onOpenChange={setCreateCustomerOpen}>
        <DialogContent className="flex max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-[530px] flex-col gap-0 overflow-hidden rounded-xl p-0 sm:max-h-[94dvh]">
          <DialogHeader className="shrink-0 border-b bg-background px-4 py-3 sm:px-5 sm:py-4">
            <DialogTitle>New customer</DialogTitle>
          </DialogHeader>
          <CustomerForm
            presentation="dialog"
            onCreated={(customer) => {
              setSelectedCustomer(customer);
              updateField("customerId", customer.id);
              setCreateCustomerOpen(false);
            }}
            onCancel={() => setCreateCustomerOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </form>
  );
}
