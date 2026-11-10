"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOptimistic, useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import {
  archiveProjectAction,
  deleteProjectTaskAction,
  getProject,
  updateProjectStatusAction,
  updateProjectAction,
  updateProjectTaskAction,
} from "@/actions/project";
import {
  Activity,
  Archive,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Flag,
  Kanban,
  LayoutDashboard,
  ListTodo,
  MessageCircle,
  Pencil,
  Trash2,
  UserRound,
  UsersRound,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from "@/components/ui/avatar";
import { formatInIST } from "@/lib/date";
import { TaskStatusBoard } from "@/components/projects/task-status-board";
import { TaskStatusSettingsDialog } from "@/components/projects/task-status-settings-dialog";
import { TaskPreviewDrawer } from "@/components/projects/task-preview-drawer";
import { TaskCreateDialog, type TaskComposerProject } from "@/components/projects/task-create-dialog";
import { TaskFolderNavigation } from "@/components/projects/task-folder-navigation";
import type { TaskStatusGroup } from "@/lib/task-status";
import {
  type MultiSelectOption,
} from "@/components/ui/multi-select";
import { OptionSelect } from "@/components/ui/option-select";
import { ProjectChat } from "@/components/projects/project-chat";

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

function dateLabel(value: Date | string | null | undefined) {
  if (!value) return "Not set";
  return formatInIST(new Date(value), "d MMM yyyy");
}

function dateTimeLabel(value: Date | string) {
  return formatInIST(new Date(value), "d MMM yyyy, HH:mm");
}

function priorityLabel(value: string) {
  return value[0] + value.slice(1).toLowerCase();
}

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "?";
}

export function ProjectWorkspace({ data }: { data: ProjectWorkspaceData }) {
  const router = useRouter();
  const { project, permissions } = data;
  const [activeTab, setActiveTab] = useState<"overview" | "tasks" | "board" | "team" | "activity" | "chat">("overview");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [dateBeingSet, setDateBeingSet] = useState<"startDate" | "dueDate" | null>(null);
  const [dateDraft, setDateDraft] = useState("");
  const [boardTasks, setOptimisticTaskStatus] = useOptimistic(
    project.tasks,
    (
      currentTasks,
      update: { taskId: string; status: string; statusGroup: TaskStatusGroup },
    ) => currentTasks.map((task) =>
      task.id === update.taskId
        ? { ...task, status: update.status, statusGroup: update.statusGroup }
        : task,
    ),
  );
  const [, startTransition] = useTransition();
  const [selectedStatus, setSelectedStatus] = useState(project.status);

  async function saveProjectDate(field: "startDate" | "dueDate") {
    if (!dateDraft) return;
    const otherDate = field === "startDate" ? project.dueDate : project.startDate;
    const otherDateValue = otherDate ? new Date(otherDate).toISOString().slice(0, 10) : "";
    if (
      otherDateValue &&
      ((field === "startDate" && dateDraft > otherDateValue) ||
        (field === "dueDate" && dateDraft < otherDateValue))
    ) {
      toast.error(field === "startDate"
        ? "Start date must be on or before the target completion date."
        : "Target completion must be on or after the start date.");
      return;
    }

    setPending(true);
    try {
      const result = await updateProjectAction({
        projectId: project.id,
        [field]: dateDraft,
      });
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      setDateBeingSet(null);
      setDateDraft("");
      router.refresh();
    } catch (error) {
      console.error("Failed to set project date", error);
      toast.error("Unable to set project date.");
    } finally {
      setPending(false);
    }
  }

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

  function updateTaskStatus(taskId: string, status: string) {
    const nextStatus = project.taskStatuses.find((candidate) => candidate.id === status);
    const previousStatus = boardTasks.find((task) => task.id === taskId)?.status;
    if (!nextStatus || !previousStatus || previousStatus === nextStatus.id) return;
    setPending(true);
    startTransition(async () => {
      setOptimisticTaskStatus({
        taskId,
        status: nextStatus.id,
        statusGroup: nextStatus.group,
      });
      try {
        const result = await updateProjectTaskAction({ taskId, status: nextStatus.id });
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
    });
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

  async function updateTaskFolder(taskId: string, folderId: string) {
    setPending(true);
    try {
      const result = await updateProjectTaskAction({ taskId, folderId });
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      router.refresh();
    } catch (error) {
      console.error("Failed to move task to another folder", error);
      toast.error("Unable to move task.");
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

  const composerProjects: TaskComposerProject[] = [{
    id: project.id,
    name: project.name,
    projectCode: project.projectCode,
    projectManager: project.projectManager
      ? { id: project.projectManager.id, name: project.projectManager.name }
      : null,
    members: project.members.map(({ user }) => ({ id: user.id, name: user.name })),
    taskStatuses: project.taskStatuses,
    taskFolders: project.taskFolders,
  }];
  const taskFolderOptions: MultiSelectOption[] = project.taskFolders.map((folder) => {
    const foldersById = new Map(project.taskFolders.map((item) => [item.id, item]));
    const path: string[] = [];
    let current = foldersById.get(folder.id);
    while (current) {
      path.unshift(current.name);
      current = current.parentId ? foldersById.get(current.parentId) : undefined;
    }
    return { value: folder.id, label: path.join(" / "), icon: "project" };
  });
  const visibleProjectTasks = project.tasks.filter((task) =>
    selectedFolderId === null || task.folderId === selectedFolderId,
  );
  const visibleBoardTasks = boardTasks.filter((task) =>
    selectedFolderId === null || task.folderId === selectedFolderId,
  );
  const projectStatusOptions: MultiSelectOption[] = data.statusOptions.map((status) => ({
    value: status,
    label: projectStatusLabels[status],
    icon: status === "COMPLETED"
      ? "completed"
      : status === "CANCELLED"
        ? "cancelled"
        : status === "ON_HOLD"
          ? "onHold"
          : status === "IN_PROGRESS"
            ? "inProgress"
            : status === "PLANNING"
              ? "planning"
              : "notStarted",
  }));
  const taskStatusLabels = Object.fromEntries(
    project.taskStatuses.map(({ id, name }) => [id, name]),
  );
  const taskStatusGroups = Object.fromEntries(
    project.taskStatuses.map(({ id, group }) => [id, group]),
  );
  const taskStatusOptions: MultiSelectOption[] = project.taskStatuses.map((status) => ({
    value: status.id,
    label: status.name,
    color: status.color,
    icon: status.group === "DONE"
      ? "completed"
      : status.group === "CLOSED"
        ? "cancelled"
        : status.group === "ACTIVE"
          ? "inProgress"
          : "notStarted",
  }));
  const completedTasks = project.tasks.filter((task) => task.statusGroup === "DONE").length;
  const activeTasks = project.tasks.filter((task) => task.statusGroup === "ACTIVE").length;
  const today = formatInIST(new Date(), "yyyy-MM-dd");
  const overdueTasks = project.tasks.filter((task) =>
    task.dueDate &&
    formatInIST(new Date(task.dueDate), "yyyy-MM-dd") < today &&
    task.statusGroup !== "DONE" &&
    task.statusGroup !== "CLOSED",
  ).length;
  const taskProgress = project.tasks.length
    ? Math.round((completedTasks / project.tasks.length) * 100)
    : 0;
  const boardStatuses = project.taskStatuses.map(({ id }) => id);

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-xl border bg-card">
        <div className="flex flex-col gap-5 border-b p-4 sm:p-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-mono text-sm text-muted-foreground">{project.projectCode}</p>
              <Badge variant="secondary">{projectStatusLabels[project.status]}</Badge>
              <Badge variant="outline" className="gap-1">
                <Flag aria-hidden="true" />
                {priorityLabel(project.priority)}
              </Badge>
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
              <>
                <TaskStatusSettingsDialog
                  projectId={project.id}
                  initialStatuses={project.taskStatuses}
                  initialTemplateId={project.workflowTemplateId}
                />
                <Button asChild variant="outline">
                  <Link href={`/dashboard/projects/${project.id}/edit`}>
                    <Pencil aria-hidden="true" />
                    Edit project
                  </Link>
                </Button>
              </>
            )}
            {permissions.canArchive && (
              <ConfirmDialog
                trigger={<Button variant="outline" disabled={pending}><Archive aria-hidden="true" />Archive</Button>}
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
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <UserRound aria-hidden="true" className="size-4" />
              Project manager
            </p>
            <p className="mt-1 font-medium">{project.projectManager?.name ?? "Not assigned"}</p>
          </div>
          <div className="p-4 sm:p-5">
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <UsersRound aria-hidden="true" className="size-4" />
              Team
            </p>
            {project.members.length ? (
              <button
                type="button"
                aria-label="View project team"
                onClick={() => setActiveTab("team")}
                className="mt-2 inline-flex rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <AvatarGroup aria-hidden="true">
                  {project.members.slice(0, 5).map(({ user }) => (
                    <Avatar key={user.id} title={user.name}>
                      <AvatarImage src={user.image ?? undefined} alt="" />
                      <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                    </Avatar>
                  ))}
                  {project.members.length > 5 && (
                    <AvatarGroupCount>
                      +{project.members.length - 5}
                    </AvatarGroupCount>
                  )}
                </AvatarGroup>
              </button>
            ) : (
              <p className="mt-1 font-medium">No team members</p>
            )}
          </div>
          <div className="p-4 sm:p-5">
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarDays aria-hidden="true" className="size-4" />
              Start date
            </p>
            {project.startDate ? (
              <p className="mt-1 font-medium">{dateLabel(project.startDate)}</p>
            ) : permissions.canEdit && dateBeingSet === "startDate" ? (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Input
                  type="date"
                  aria-label="Project start date"
                  value={dateDraft}
                  onChange={(event) => setDateDraft(event.target.value)}
                  className="h-8 w-auto min-w-0"
                />
                <Button type="button" size="sm" disabled={pending || !dateDraft} onClick={() => void saveProjectDate("startDate")}>
                  Save
                </Button>
                <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={() => setDateBeingSet(null)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <div className="mt-1 flex items-center gap-2">
                <span className="font-medium text-muted-foreground">Not set</span>
                {permissions.canEdit && (
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="h-auto p-0"
                    onClick={() => {
                      setDateDraft("");
                      setDateBeingSet("startDate");
                    }}
                  >
                    Set date
                  </Button>
                )}
              </div>
            )}
          </div>
          <div className="p-4 sm:p-5">
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarDays aria-hidden="true" className="size-4" />
              Target completion
            </p>
            {project.dueDate ? (
              <p className="mt-1 font-medium">{dateLabel(project.dueDate)}</p>
            ) : permissions.canEdit && dateBeingSet === "dueDate" ? (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Input
                  type="date"
                  aria-label="Project target completion date"
                  value={dateDraft}
                  onChange={(event) => setDateDraft(event.target.value)}
                  className="h-8 w-auto min-w-0"
                />
                <Button type="button" size="sm" disabled={pending || !dateDraft} onClick={() => void saveProjectDate("dueDate")}>
                  Save
                </Button>
                <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={() => setDateBeingSet(null)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <div className="mt-1 flex items-center gap-2">
                <span className="font-medium text-muted-foreground">Not set</span>
                {permissions.canEdit && (
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="h-auto p-0"
                    onClick={() => {
                      setDateDraft("");
                      setDateBeingSet("dueDate");
                    }}
                  >
                    Set date
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      <nav aria-label="Project workspace views" className="-mx-1 flex gap-1 overflow-x-auto border-b px-1">
        {([
          { tab: "overview", label: "Overview", icon: LayoutDashboard },
          { tab: "tasks", label: "Tasks", icon: ListTodo },
          { tab: "board", label: "Board", icon: Kanban },
          { tab: "team", label: "Team", icon: UsersRound },
          { tab: "activity", label: "Activity", icon: Activity },
          { tab: "chat", label: "Chat", icon: MessageCircle },
        ] as const).map(({ tab, label, icon: TabIcon }) => (
          <button
            key={tab}
            type="button"
            aria-pressed={activeTab === tab}
            onClick={() => setActiveTab(tab)}
            className={`min-h-11 shrink-0 border-b-2 px-3 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              activeTab === tab
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <TabIcon aria-hidden="true" className="mr-1.5 inline size-4 align-text-bottom" />
            {label}
          </button>
        ))}
      </nav>

      {activeTab === "chat" ? (
        <ProjectChat projectId={project.id} />
      ) : activeTab === "tasks" ? (
      <div
        aria-label="Project tasks"
        className="grid gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(280px,0.8fr)]"
      >
        <section className="space-y-5">
          <article className="rounded-xl border bg-card p-4 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Tasks</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {visibleProjectTasks.length} visible task{visibleProjectTasks.length === 1 ? "" : "s"}
                  {!permissions.canReadAllTasks && " assigned to you"}
                </p>
              </div>
              {permissions.canCreateTasks && (
                <TaskCreateDialog
                  projects={composerProjects}
                  defaultProjectId={project.id}
                  defaultFolderId={selectedFolderId}
                />
              )}
            </div>
            <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(190px,0.65fr)_minmax(0,2fr)]">
              <TaskFolderNavigation
                projectId={project.id}
                folders={project.taskFolders}
                tasks={project.tasks}
                selectedFolderId={selectedFolderId}
                onSelect={setSelectedFolderId}
                canManage={permissions.canEdit}
              />
              <div className="min-w-0 space-y-3">
                {visibleProjectTasks.length === 0 ? (
                  <div className="rounded-lg border border-dashed px-4 py-8 text-center">
                    <p className="font-medium">{project.tasks.length ? "No tasks in this folder" : "No tasks yet"}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {project.tasks.length
                        ? "Choose another folder or create a task here."
                        : "Create a task to start tracking this project’s work."}
                    </p>
                  </div>
                ) : visibleProjectTasks.map((task) => {
                  const mayUpdate =
                    permissions.canUpdateTasks ||
                    (permissions.canUpdateOwnTasks && task.assigneeId === data.actorId);
                  return (
                    <article key={task.id} className="rounded-lg border p-3 sm:p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={() => setSelectedTaskId(task.id)}
                            className="break-words text-left font-medium outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            {task.title}
                          </button>
                          {task.description && (
                            <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{task.description}</p>
                          )}
                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              <UserRound aria-hidden="true" className="size-3.5" />
                              {task.assignee?.name ?? "Unassigned"}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <CalendarDays aria-hidden="true" className="size-3.5" />
                              Due {dateLabel(task.dueDate)}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Flag aria-hidden="true" className="size-3.5" />
                              {priorityLabel(task.priority)} priority
                            </span>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          {permissions.canUpdateTasks && (
                            <OptionSelect
                              label={`Folder for ${task.title}`}
                              value={task.folderId}
                              disabled={pending}
                              onValueChange={(folderId) => void updateTaskFolder(task.id, folderId)}
                              options={taskFolderOptions}
                              className="h-9 max-w-40"
                            />
                          )}
                          <OptionSelect
                            label={`Status for ${task.title}`}
                            value={task.status}
                            disabled={!mayUpdate || pending}
                            onValueChange={(value) => updateTaskStatus(task.id, value)}
                            options={taskStatusOptions}
                            className="h-9 max-w-36"
                          />
                          {permissions.canDeleteTasks && (
                            <ConfirmDialog
                              trigger={<Button variant="ghost" size="sm" disabled={pending}><Trash2 aria-hidden="true" />Remove</Button>}
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
            </div>
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
                <OptionSelect
                  label="Project status"
                  value={selectedStatus}
                  onValueChange={(value) => setSelectedStatus(value as typeof project.status)}
                  options={projectStatusOptions}
                />
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
      ) : activeTab === "overview" ? (
        <section
          aria-label="Project overview"
          className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(280px,0.8fr)]"
        >
          <div className="space-y-4">
            <section className="rounded-xl border bg-card p-4 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold">Delivery snapshot</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {permissions.canReadAllTasks
                      ? "Progress across every project task."
                      : "Progress across tasks assigned to you."}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-semibold tabular-nums">{taskProgress}%</span>
                  {permissions.canCreateTasks && (
                    <Button type="button" size="sm" onClick={() => setActiveTab("tasks")}>
                      Add task
                    </Button>
                  )}
                </div>
              </div>
              <div
                role="progressbar"
                aria-label="Task completion"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={taskProgress}
                className="mt-4 h-2 overflow-hidden rounded-full bg-muted"
              >
                <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${taskProgress}%` }} />
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: "Visible tasks", count: project.tasks.length, icon: ListTodo },
                  { label: "Active", count: activeTasks, icon: Clock3 },
                  { label: "Completed", count: completedTasks, icon: CheckCircle2 },
                  { label: "Overdue", count: overdueTasks, icon: CircleAlert },
                ].map(({ label, count, icon: StatIcon }) => (
                  <div key={label} className="rounded-md bg-muted/50 px-3 py-2">
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <StatIcon aria-hidden="true" className="size-3.5" />
                      {label}
                    </p>
                    <p className="mt-1 font-semibold tabular-nums">{count}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-xl border bg-card p-4 sm:p-6">
              <h2 className="text-lg font-semibold">Project brief</h2>
              {project.description ? (
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{project.description}</p>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">Add a project description to keep the team aligned.</p>
              )}
              {(project.objectives || project.scope) && (
                <div className="mt-5 grid gap-5 border-t pt-4 md:grid-cols-2">
                  {project.objectives && (
                    <div>
                      <h3 className="text-sm font-medium">Objectives</h3>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{project.objectives}</p>
                    </div>
                  )}
                  {project.scope && (
                    <div>
                      <h3 className="text-sm font-medium">Scope and deliverables</h3>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{project.scope}</p>
                    </div>
                  )}
                </div>
              )}
            </section>
          </div>

          <aside className="space-y-4">
            <section className="rounded-xl border bg-card p-4 sm:p-5">
              <h2 className="font-semibold">Next deadlines</h2>
              {project.tasks.filter((task) => task.dueDate && task.statusGroup !== "DONE" && task.statusGroup !== "CLOSED").length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">No upcoming task deadlines.</p>
              ) : (
                <ul className="mt-3 space-y-3">
                  {project.tasks
                    .filter((task) => task.dueDate && task.statusGroup !== "DONE" && task.statusGroup !== "CLOSED")
                    .slice(0, 5)
                    .map((task) => (
                      <li key={task.id} className="border-l-2 border-primary/40 pl-3">
                        <button
                          type="button"
                          onClick={() => setSelectedTaskId(task.id)}
                          className="break-words text-left text-sm font-medium hover:text-primary"
                        >
                          {task.title}
                        </button>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {dateLabel(task.dueDate)} · {task.assignee?.name ?? "Unassigned"}
                        </p>
                      </li>
                    ))}
                </ul>
              )}
            </section>
            <section className="rounded-xl border bg-card p-4 sm:p-5">
              <h2 className="font-semibold">Project team</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {project.projectManager?.name ?? "No project manager"} · {project.members.length} team member{project.members.length === 1 ? "" : "s"}
              </p>
              <Button type="button" variant="link" className="mt-2 h-auto p-0" onClick={() => setActiveTab("team")}>
                View team
              </Button>
            </section>
            {permissions.canChangeStatus && (
              <section className="rounded-xl border bg-card p-4 sm:p-5">
                <h2 className="font-semibold">Project status</h2>
                <form onSubmit={saveStatus} className="mt-3 grid gap-3">
                  <OptionSelect
                    label="Project status"
                    value={selectedStatus}
                    onValueChange={(value) => setSelectedStatus(value as typeof project.status)}
                    options={projectStatusOptions}
                  />
                  <Button type="submit" disabled={pending || selectedStatus === project.status}>Update status</Button>
                </form>
              </section>
            )}
          </aside>
        </section>
      ) : activeTab === "board" ? (
        <div className="grid gap-5 xl:grid-cols-[minmax(190px,0.65fr)_minmax(0,2fr)]">
          <TaskFolderNavigation
            projectId={project.id}
            folders={project.taskFolders}
            tasks={project.tasks}
            selectedFolderId={selectedFolderId}
            onSelect={setSelectedFolderId}
            canManage={permissions.canEdit}
          />
          <TaskStatusBoard
            id={`project-${project.id}-task-board`}
            items={visibleBoardTasks}
            statuses={boardStatuses}
            statusLabels={taskStatusLabels}
            statusGroups={taskStatusGroups}
            statusColors={Object.fromEntries(
              project.taskStatuses.map(({ id, color }) => [id, color]),
            )}
            canMove={(task) => !pending && (
              permissions.canUpdateTasks ||
              (permissions.canUpdateOwnTasks && task.assigneeId === data.actorId)
            )}
            onMove={(taskId, status) => void updateTaskStatus(taskId, status)}
            renderTask={(task, dragHandle) => {
              const mayUpdate =
                permissions.canUpdateTasks ||
                (permissions.canUpdateOwnTasks && task.assigneeId === data.actorId);
              return (
                <article className="rounded-lg border bg-card p-3">
                  <div className="flex items-start justify-between gap-1">
                    <button
                      type="button"
                      onClick={() => setSelectedTaskId(task.id)}
                      className="break-words text-left text-sm font-medium hover:text-primary"
                    >
                      {task.title}
                    </button>
                    {dragHandle}
                  </div>
                  <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <UserRound aria-hidden="true" className="size-3.5" />
                      {task.assignee?.name ?? "Unassigned"}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Flag aria-hidden="true" className="size-3.5" />
                      {priorityLabel(task.priority)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays aria-hidden="true" className="size-3.5" />
                      {dateLabel(task.dueDate)}
                    </span>
                  </p>
                  <OptionSelect
                    label={`Status for ${task.title}`}
                    value={task.status}
                    disabled={!mayUpdate || pending}
                    onValueChange={(value) => updateTaskStatus(task.id, value)}
                    options={taskStatusOptions}
                    className="mt-3 h-9"
                  />
                </article>
              );
            }}
          />
        </div>
      ) : activeTab === "team" ? (
        <section
          aria-label="Project team"
          className="rounded-xl border bg-card p-4 sm:p-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Project team</h2>
              <p className="mt-1 text-sm text-muted-foreground">People responsible for delivering this work.</p>
            </div>
            {permissions.canManageTeam && (
              <Button asChild variant="outline">
                <Link href={`/dashboard/projects/${project.id}/team`}>Manage team</Link>
              </Button>
            )}
          </div>
          <ul className="mt-5 divide-y">
            {project.projectManager && (
              <li className="flex items-center justify-between gap-3 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar aria-hidden="true">
                    <AvatarImage src={project.projectManager.image ?? undefined} alt="" />
                    <AvatarFallback>{getInitials(project.projectManager.name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{project.projectManager.name}</p>
                    <p className="text-sm text-muted-foreground">{project.projectManager.designation ?? "Project manager"}</p>
                  </div>
                </div>
                <Badge variant="secondary">Project manager</Badge>
              </li>
            )}
            {project.members.map(({ user }) => (
              <li key={user.id} className="flex items-center justify-between gap-3 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar aria-hidden="true">
                    <AvatarImage src={user.image ?? undefined} alt="" />
                    <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{user.name}</p>
                    <p className="text-sm text-muted-foreground">{user.designation ?? "Team member"}</p>
                  </div>
                </div>
                <span className="text-sm text-muted-foreground">
                  {project.tasks.filter((task) =>
                    task.assigneeId === user.id &&
                    task.statusGroup !== "DONE" &&
                    task.statusGroup !== "CLOSED",
                  ).length} visible open tasks
                </span>
              </li>
            ))}
            {!project.projectManager && project.members.length === 0 && (
              <li className="py-8 text-center text-sm text-muted-foreground">No project team assigned yet.</li>
            )}
          </ul>
        </section>
      ) : (
        <section
          aria-label="Project activity"
          className="rounded-xl border bg-card p-4 sm:p-6"
        >
          <h2 className="text-lg font-semibold">Project activity</h2>
          <p className="mt-1 text-sm text-muted-foreground">A chronological record of project and task changes.</p>
          {project.activities.length === 0 ? (
            <p className="mt-5 rounded-md border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">No activity recorded yet.</p>
          ) : (
            <ol className="mt-5 space-y-4">
              {project.activities.map((activity) => (
                <li key={activity.id} className="border-l-2 border-primary/30 pl-4">
                  <p className="text-sm">{activity.message}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {activity.actor?.name ?? "System"} · {dateTimeLabel(activity.createdAt)}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </section>
      )}
      <TaskPreviewDrawer
        taskId={selectedTaskId}
        open={selectedTaskId !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedTaskId(null);
        }}
        onTaskSelect={setSelectedTaskId}
      />
    </div>
  );
}
