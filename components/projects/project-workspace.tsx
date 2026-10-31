"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import {
  archiveProjectAction,
  createProjectTaskAction,
  deleteProjectTaskAction,
  getProject,
  updateProjectStatusAction,
  updateProjectTaskAction,
} from "@/actions/project";
import type { ProjectPriority } from "@/app/generated/prisma/enums";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export type ProjectWorkspaceData = NonNullable<
  Extract<Awaited<ReturnType<typeof getProject>>, { success: true }>["data"]
>;

const projectStatusLabels: Record<string, string> = {
  PLANNING: "Planning",
  NOT_STARTED: "Not started",
  IN_PROGRESS: "In progress",
  ON_HOLD: "On hold",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

const taskStatusLabels: Record<string, string> = {
  TODO: "To do",
  IN_PROGRESS: "In progress",
  BLOCKED: "Blocked",
  DONE: "Done",
  CANCELLED: "Cancelled",
};

function dateLabel(value: Date | string | null | undefined) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function dateTimeLabel(value: Date | string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function priorityLabel(value: string) {
  return value[0] + value.slice(1).toLowerCase();
}

export function ProjectWorkspace({ data }: { data: ProjectWorkspaceData }) {
  const router = useRouter();
  const { project, permissions } = data;
  const [pending, setPending] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(project.status);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskAssignee, setTaskAssignee] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskPriority, setTaskPriority] = useState<ProjectPriority>("MEDIUM");

  async function saveStatus(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    try {
      const result = await updateProjectStatusAction({
        projectId: project.id,
        status: selectedStatus,
      });
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      router.refresh();
    } catch (error) {
      console.error("Failed to update project status", error);
      toast.error("Unable to update project status.");
    } finally {
      setPending(false);
    }
  }

  async function createTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    try {
      const result = await createProjectTaskAction({
        projectId: project.id,
        title: taskTitle,
        description: taskDescription || null,
        assigneeId: taskAssignee || null,
        dueDate: taskDueDate || null,
        priority: taskPriority,
      });
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      setTaskTitle("");
      setTaskDescription("");
      setTaskAssignee("");
      setTaskDueDate("");
      setTaskPriority("MEDIUM");
      toast.success(result.message);
      router.refresh();
    } catch (error) {
      console.error("Failed to create project task", error);
      toast.error("Unable to create task.");
    } finally {
      setPending(false);
    }
  }

  async function updateTaskStatus(taskId: string, status: string) {
    setPending(true);
    try {
      const result = await updateProjectTaskAction({ taskId, status });
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      router.refresh();
    } catch (error) {
      console.error("Failed to update task", error);
      toast.error("Unable to update task.");
    } finally {
      setPending(false);
    }
  }

  async function removeTask(taskId: string) {
    setPending(true);
    try {
      const result = await deleteProjectTaskAction(taskId);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      router.refresh();
    } catch (error) {
      console.error("Failed to remove project task", error);
      toast.error("Unable to remove task.");
    } finally {
      setPending(false);
    }
  }

  async function archive() {
    setPending(true);
    try {
      const result = await archiveProjectAction(project.id);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      router.push("/dashboard/projects");
      router.refresh();
    } catch (error) {
      console.error("Failed to archive project", error);
      toast.error("Unable to archive project.");
    } finally {
      setPending(false);
    }
  }

  const assignees = [
    ...(project.projectManager ? [project.projectManager] : []),
    ...project.members.map(({ user }) => user),
  ].filter((person, index, all) => all.findIndex(({ id }) => id === person.id) === index);

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-xl border bg-card">
        <div className="flex flex-col gap-5 border-b p-4 sm:p-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-mono text-sm text-muted-foreground">{project.projectCode}</p>
              <Badge variant="secondary">{projectStatusLabels[project.status]}</Badge>
              <Badge variant="outline">{priorityLabel(project.priority)}</Badge>
            </div>
            <h1 className="mt-3 break-words text-2xl font-semibold tracking-tight sm:text-3xl">{project.name}</h1>
            {project.description && (
              <p className="mt-3 max-w-3xl whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                {project.description}
              </p>
            )}
            {project.customer && !project.customer.deletedAt && (
              <Link
                href={`/dashboard/customers/${project.customer.id}`}
                className="mt-4 inline-flex font-medium text-primary underline-offset-4 hover:underline"
              >
                {project.customer.displayName}
                {project.customer.companyName ? ` · ${project.customer.companyName}` : ""}
              </Link>
            )}
            {project.customer?.deletedAt && (
              <p className="mt-4 text-sm text-muted-foreground">
                {project.customer.displayName} · Archived customer
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {permissions.canEdit && (
              <Button asChild variant="outline">
                <Link href={`/dashboard/projects/${project.id}/edit`}>Edit project</Link>
              </Button>
            )}
            {permissions.canArchive && (
              <ConfirmDialog
                trigger={<Button variant="outline" disabled={pending}>Archive</Button>}
                title="Archive this project?"
                description="The project will be removed from the active project list."
                confirmLabel="Archive project"
                disabled={pending}
                onConfirm={() => void archive()}
              />
            )}
          </div>
        </div>

        <div className="grid divide-y sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
          <div className="p-4 sm:p-5">
            <p className="text-sm text-muted-foreground">Project manager</p>
            <p className="mt-1 font-medium">{project.projectManager?.name ?? "Not assigned"}</p>
          </div>
          <div className="p-4 sm:p-5">
            <p className="text-sm text-muted-foreground">Team</p>
            <p className="mt-1 font-medium">
              {project.members.length
                ? project.members.map(({ user }) => user.name).join(", ")
                : "No team members"}
            </p>
          </div>
          <div className="p-4 sm:p-5">
            <p className="text-sm text-muted-foreground">Start date</p>
            <p className="mt-1 font-medium">{dateLabel(project.startDate)}</p>
          </div>
          <div className="p-4 sm:p-5">
            <p className="text-sm text-muted-foreground">Target completion</p>
            <p className="mt-1 font-medium">{dateLabel(project.dueDate)}</p>
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(280px,0.8fr)]">
        <section className="space-y-5">
          <article className="rounded-xl border bg-card p-4 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Tasks</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {project.tasks.length} visible task{project.tasks.length === 1 ? "" : "s"}
                  {!permissions.canReadAllTasks && " assigned to you"}
                </p>
              </div>
            </div>
            {permissions.canCreateTasks && (
              <form onSubmit={createTask} className="mt-5 grid gap-3 rounded-lg border bg-muted/20 p-3 sm:grid-cols-2 sm:p-4">
                <label className="grid gap-1.5 text-sm font-medium sm:col-span-2">
                  Task title
                  <Input required maxLength={160} value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} />
                </label>
                <label className="grid gap-1.5 text-sm font-medium">
                  Assign to
                  <select
                    value={taskAssignee}
                    onChange={(event) => setTaskAssignee(event.target.value)}
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="">Unassigned</option>
                    {assignees.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
                  </select>
                </label>
                <label className="grid gap-1.5 text-sm font-medium">
                  Target date
                  <Input type="date" value={taskDueDate} onChange={(event) => setTaskDueDate(event.target.value)} />
                </label>
                <label className="grid gap-1.5 text-sm font-medium">
                  Priority
                  <select
                    value={taskPriority}
                    onChange={(event) => setTaskPriority(event.target.value as ProjectPriority)}
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </label>
                <label className="grid gap-1.5 text-sm font-medium sm:col-span-2">
                  Notes
                  <Textarea rows={2} maxLength={3000} value={taskDescription} onChange={(event) => setTaskDescription(event.target.value)} />
                </label>
                <div className="sm:col-span-2">
                  <Button type="submit" disabled={pending || !taskTitle.trim()}>
                    {pending ? "Saving…" : "Add task"}
                  </Button>
                </div>
              </form>
            )}
            {project.tasks.length === 0 ? (
              <div className="mt-5 rounded-lg border border-dashed px-4 py-8 text-center">
                <p className="font-medium">No tasks yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Add tasks to make the project work visible and assignable.
                </p>
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {project.tasks.map((task) => {
                  const mayUpdate =
                    permissions.canUpdateTasks ||
                    (permissions.canUpdateOwnTasks && task.assigneeId === data.actorId);
                  return (
                    <article key={task.id} className="rounded-lg border p-3 sm:p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <h3 className="break-words font-medium">{task.title}</h3>
                          {task.description && (
                            <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{task.description}</p>
                          )}
                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                            <span>{task.assignee?.name ?? "Unassigned"}</span>
                            <span>Due {dateLabel(task.dueDate)}</span>
                            <span>{priorityLabel(task.priority)} priority</span>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <select
                            aria-label={`Status for ${task.title}`}
                            value={task.status}
                            disabled={!mayUpdate || pending}
                            onChange={(event) => void updateTaskStatus(task.id, event.target.value)}
                            className="h-9 max-w-36 rounded-md border border-input bg-background px-2 text-sm disabled:opacity-60"
                          >
                            {Object.entries(taskStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                          </select>
                          {permissions.canDeleteTasks && (
                            <ConfirmDialog
                              trigger={<Button variant="ghost" size="sm" disabled={pending}>Remove</Button>}
                              title="Remove task?"
                              description="This task will be removed from the project."
                              confirmLabel="Remove task"
                              disabled={pending}
                              onConfirm={() => void removeTask(task.id)}
                            />
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </article>

          {(project.objectives || project.scope) && (
            <article className="rounded-xl border bg-card p-4 sm:p-6">
              <h2 className="text-lg font-semibold">Objectives and scope</h2>
              {project.objectives && (
                <div className="mt-4">
                  <h3 className="text-sm font-medium">Objectives</h3>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{project.objectives}</p>
                </div>
              )}
              {project.scope && (
                <div className="mt-5 border-t pt-4">
                  <h3 className="text-sm font-medium">Scope and deliverables</h3>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{project.scope}</p>
                </div>
              )}
            </article>
          )}
        </section>

        <aside className="space-y-5">
          {permissions.canChangeStatus && (
            <section className="rounded-xl border bg-card p-4 sm:p-5">
              <h2 className="font-semibold">Project status</h2>
              <form onSubmit={saveStatus} className="mt-3 grid gap-3">
                <select
                  value={selectedStatus}
                  onChange={(event) => setSelectedStatus(event.target.value as typeof project.status)}
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  {data.statusOptions.map((status) => (
                    <option key={status} value={status}>{projectStatusLabels[status]}</option>
                  ))}
                </select>
                <Button type="submit" disabled={pending || selectedStatus === project.status}>
                  Update status
                </Button>
              </form>
            </section>
          )}

          {permissions.canViewBudget && project.budgetAmount !== null && (
            <section className="rounded-xl border bg-card p-4 sm:p-5">
              <h2 className="font-semibold">Planned budget</h2>
              <p className="mt-2 text-2xl font-semibold tabular-nums">
                {project.currency} {project.budgetAmount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
              </p>
            </section>
          )}

          <section className="rounded-xl border bg-card p-4 sm:p-5">
            <h2 className="font-semibold">Related records</h2>
            <div className="mt-3 space-y-3 text-sm">
              {project.customer && !project.customer.deletedAt ? (
                <Link className="block text-primary underline-offset-4 hover:underline" href={`/dashboard/customers/${project.customer.id}`}>
                  Customer: {project.customer.displayName}
                </Link>
              ) : project.customer ? (
                <p className="text-muted-foreground">Archived customer: {project.customer.displayName}</p>
              ) : <p className="text-muted-foreground">No customer linked</p>}
              {project.proposal ? (
                <Link className="block text-primary underline-offset-4 hover:underline" href={`/dashboard/proposals/${project.proposal.id}/preview`}>
                  Proposal: QUOT-{project.proposal.proposalNumber}
                </Link>
              ) : <p className="text-muted-foreground">No proposal linked</p>}
              {data.relatedInvoices.length > 0 && (
                <div className="border-t pt-3">
                  <p className="mb-2 font-medium">Recent invoices</p>
                  <ul className="space-y-2">
                    {data.relatedInvoices.map((invoice) => (
                      <li key={invoice.id}>
                        <Link className="flex flex-wrap items-center justify-between gap-2 text-primary underline-offset-4 hover:underline" href={`/dashboard/invoices/${invoice.id}`}>
                          <span>INV-{String(invoice.invoiceNumber).padStart(4, "0")}</span>
                          <span className="text-xs text-muted-foreground">{invoice.status.replaceAll("_", " ")}</span>
                        </Link>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {invoice.currency} {invoice.grandTotal.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
                </div>
              </section>

          {permissions.canManageProjects && project.internalNotes && (
            <section className="rounded-xl border bg-card p-4 sm:p-5">
              <h2 className="font-semibold">Internal notes</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{project.internalNotes}</p>
            </section>
          )}

          <section className="rounded-xl border bg-card p-4 sm:p-5">
            <h2 className="font-semibold">Recent activity</h2>
            {project.activities.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">No activity recorded yet.</p>
            ) : (
              <ol className="mt-4 space-y-4">
                {project.activities.map((activity) => (
                  <li key={activity.id} className="border-l-2 border-border pl-3">
                    <p className="text-sm">{activity.message}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {activity.actor?.name ?? "System"} · {dateTimeLabel(activity.createdAt)}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
