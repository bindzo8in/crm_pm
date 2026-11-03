"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOptimistic, useState, useTransition, type ReactNode } from "react";
import { toast } from "sonner";
import { updateProjectTaskAction } from "@/actions/project";
import type { ProjectPriority } from "@/app/generated/prisma/enums";
import {
  isTaskStatusTerminal,
  TASK_STATUS_GROUPS,
  type TaskStatusGroup,
} from "@/lib/task-status";
import {
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  CircleDashed,
  Clock3,
  Flag,
  FilePlus2,
  FolderKanban,
  LayoutGrid,
  List,
  ListTodo,
  Search,
  UserRound,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { getProjectTaskWorkspace } from "@/actions/project";
import { formatInIST } from "@/lib/date";
import { TaskStatusBoard } from "@/components/projects/task-status-board";
import {
  MultiSelect,
  type MultiSelectOption,
} from "@/components/ui/multi-select";
import { OptionSelect } from "@/components/ui/option-select";
import { TaskPreviewDrawer } from "@/components/projects/task-preview-drawer";
import { TaskCreateDialog, type TaskComposerProject } from "@/components/projects/task-create-dialog";

type TaskWorkspaceData = NonNullable<
  Extract<Awaited<ReturnType<typeof getProjectTaskWorkspace>>, { success: true }>["data"]
>;

type TaskWorkspaceView = "all" | "assigned" | "created" | "upcoming" | "overdue" | "completed";
type LayoutMode = "list" | "board";
const taskPriorityLabels: Record<ProjectPriority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
};

const taskPriorityOptions: MultiSelectOption[] = [
  { value: "LOW", label: "Low", icon: "flag" },
  { value: "MEDIUM", label: "Medium", icon: "flag" },
  { value: "HIGH", label: "High", icon: "flag" },
  { value: "URGENT", label: "Urgent", icon: "overdue" },
];

const taskViews: { id: TaskWorkspaceView; label: string; icon: typeof ListTodo }[] = [
  { id: "all", label: "All tasks", icon: ListTodo },
  { id: "assigned", label: "Assigned to me", icon: UserRound },
  { id: "created", label: "Created by me", icon: FilePlus2 },
  { id: "upcoming", label: "Upcoming", icon: CalendarDays },
  { id: "overdue", label: "Overdue", icon: CircleAlert },
  { id: "completed", label: "Completed", icon: CheckCircle2 },
];

function formatDate(value: Date | string | null) {
  if (!value) return "No due date";
  return formatInIST(new Date(value), "d MMM yyyy");
}

function isOverdue(task: TaskWorkspaceData["items"][number]) {
  if (!task.dueDate || isTaskStatusTerminal(task.statusGroup)) return false;
  return formatInIST(new Date(task.dueDate), "yyyy-MM-dd") <
    formatInIST(new Date(), "yyyy-MM-dd");
}

export function TaskWorkspace({
  data,
  view,
  search = "",
  status = [],
  priority = [],
  nextCursor,
  projectOptions,
  hasMoreProjects,
}: {
  data: TaskWorkspaceData;
  view: TaskWorkspaceView;
  search?: string;
  status?: string[];
  priority?: string[];
  nextCursor: string | null;
  projectOptions: TaskComposerProject[];
  hasMoreProjects: boolean;
}) {
  const router = useRouter();
  const [layout, setLayout] = useState<LayoutMode>("list");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [tasks, setOptimisticStatus] = useOptimistic(
    data.items,
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
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null);

  function changeStatus(taskId: string, value: string, byGroup = false) {
    const task = tasks.find((candidate) => candidate.id === taskId);
    const nextStatus = task?.project.taskStatuses.find((candidate) =>
      byGroup ? candidate.group === value : candidate.id === value,
    );
    if (!nextStatus) return;

    const previousStatus = task?.status;
    if (!previousStatus || previousStatus === nextStatus.id) return;
    setPendingTaskId(taskId);
    startTransition(async () => {
      setOptimisticStatus({
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
        console.error("Failed to update task status", error);
        toast.error("Unable to update task status.");
      } finally {
        setPendingTaskId(null);
      }
    });
  }

  function viewHref(nextView: TaskWorkspaceView, cursor?: string) {
    const params = new URLSearchParams();
    params.set("view", nextView);
    if (search) params.set("search", search);
    status.forEach((value) => params.append("status", value));
    priority.forEach((value) => params.append("priority", value));
    if (cursor) params.set("cursor", cursor);
    return `/dashboard/tasks?${params.toString()}`;
  }

  function canUpdate(task: TaskWorkspaceData["items"][number]) {
    return data.permissions.canUpdateTasks ||
      (data.permissions.canUpdateOwnTasks && task.assigneeId === data.actorId);
  }

  const taskStatusOptionMap = new Map<string, MultiSelectOption>();
  for (const task of tasks) {
    for (const definition of task.project.taskStatuses) {
      const value = `${task.project.id}:${definition.id}`;
      taskStatusOptionMap.set(value, {
        value,
        label: `${definition.name} · ${task.projectCode}`,
        icon: definition.group === "DONE"
          ? "completed"
          : definition.group === "CLOSED"
            ? "cancelled"
            : definition.group === "ACTIVE"
              ? "inProgress"
              : "notStarted",
      });
    }
  }
  for (const selection of status) {
    if (taskStatusOptionMap.has(selection)) continue;
    const separator = selection.indexOf(":");
    const projectId = separator < 0 ? null : selection.slice(0, separator);
    const statusId = separator < 0 ? selection : selection.slice(separator + 1);
    const matchingTask = tasks.find((task) => !projectId || task.project.id === projectId);
    const definition = matchingTask?.project.taskStatuses.find(({ id }) => id === statusId);
    taskStatusOptionMap.set(selection, {
      value: selection,
      label: definition
        ? `${definition.name} · ${matchingTask?.projectCode ?? projectId}`
        : statusId.replaceAll("_", " "),
      icon: definition?.group === "DONE"
        ? "completed"
        : definition?.group === "CLOSED"
          ? "cancelled"
          : definition?.group === "ACTIVE"
            ? "inProgress"
            : "notStarted",
    });
  }
  const taskStatusOptions = [...taskStatusOptionMap.values()]
    .sort((left, right) => left.label.localeCompare(right.label));
  const statusLabels = Object.fromEntries(TASK_STATUS_GROUPS.map(({ id, label }) => [id, label]));
  const statusGroups = Object.fromEntries(TASK_STATUS_GROUPS.map(({ id }) => [id, id]));
  const boardStatuses = TASK_STATUS_GROUPS.map(({ id }) => id);

  function taskCard(task: TaskWorkspaceData["items"][number], dragHandle?: ReactNode) {
    return (
      <article key={task.id} className="min-w-0 rounded-lg border bg-card p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <button
              type="button"
              onClick={() => setSelectedTaskId(task.id)}
              className="break-words text-left font-medium outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
            >
              {task.title}
            </button>
            {data.permissions.canReadAllProjects ? (
              <Link
                href={`/dashboard/projects/${task.project.id}`}
                className="mt-1 inline-flex max-w-full items-center gap-1 truncate text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                <FolderKanban aria-hidden="true" className="size-3.5 shrink-0" />
                <span className="truncate">{task.projectCode} · {task.project.name}</span>
              </Link>
            ) : (
              <p className="mt-1 flex min-w-0 items-center gap-1 truncate text-xs text-muted-foreground">
                <FolderKanban aria-hidden="true" className="size-3.5 shrink-0" />
                <span className="truncate">{task.projectCode} · {task.project.name}</span>
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {dragHandle}
            <Badge variant={task.priority === "URGENT" ? "destructive" : "outline"} className="gap-1">
              <Flag aria-hidden="true" />
            {taskPriorityLabels[task.priority]}
            </Badge>
          </div>
        </div>
        {task.description && (
          <p className="mt-2 line-clamp-2 whitespace-pre-wrap text-sm text-muted-foreground">
            {task.description}
          </p>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          Added by {task.createdBy?.name ?? "Former user"} · {formatDate(task.createdAt)}
        </p>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-3">
          <div className="min-w-0 text-xs text-muted-foreground">
            <p className="flex items-center gap-1 truncate">
              <UserRound aria-hidden="true" className="size-3.5 shrink-0" />
              <span className="truncate">{task.assignee?.name ?? "Unassigned"}</span>
            </p>
            <p className={`mt-1 flex items-center gap-1 ${isOverdue(task) ? "font-medium text-destructive" : ""}`}>
              <CalendarDays aria-hidden="true" className="size-3.5 shrink-0" />
              Due {formatDate(task.dueDate)}
            </p>
          </div>
          <OptionSelect
            label={`Status for ${task.title}`}
            value={task.status}
            disabled={!canUpdate(task) || pendingTaskId === task.id}
            onValueChange={(nextStatus) => changeStatus(task.id, nextStatus)}
            options={task.project.taskStatuses.map((statusOption) => ({
              value: statusOption.id,
              label: statusOption.name,
              icon: statusOption.group === "DONE"
                ? "completed"
                : statusOption.group === "CLOSED"
                  ? "cancelled"
                  : statusOption.group === "ACTIVE"
                    ? "inProgress"
                    : "notStarted",
            }))}
            className="h-9 max-w-36"
          />
        </div>
      </article>
    );
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <ListTodo aria-hidden="true" className="size-6 text-primary" />
            Tasks
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Keep the next action visible across your projects.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard/projects">
            <FolderKanban aria-hidden="true" />
            Browse projects
          </Link>
        </Button>
      </header>

      {data.permissions.canCreateTasks && (
        <TaskCreateDialog
          projects={projectOptions}
          defaultProjectId={projectOptions[0]?.id}
          hasMoreProjects={hasMoreProjects}
        />
      )}

      <section aria-label="Task summary" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[
          { label: "All accessible tasks", count: data.summary.total, icon: ListTodo },
          { label: "Open", count: data.summary.open, icon: CircleDashed },
          { label: "Active", count: data.summary.active, icon: Clock3 },
          { label: "Completed", count: data.summary.completed, icon: CheckCircle2 },
          { label: "Overdue", count: data.summary.overdue, icon: CircleAlert },
        ].map(({ label, count, icon: SummaryIcon }) => (
          <article key={label} className="rounded-lg border bg-card px-4 py-3">
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <SummaryIcon aria-hidden="true" className="size-4" />
              {label}
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{count}</p>
          </article>
        ))}
      </section>

      <nav aria-label="Task views" className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
        {taskViews.map(({ id, label, icon: ViewIcon }) => (
          <Link
            key={id}
            href={viewHref(id)}
            aria-current={view === id ? "page" : undefined}
            className={`shrink-0 rounded-md px-3 py-2 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              view === id
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <ViewIcon aria-hidden="true" className="mr-1.5 inline size-4 align-text-bottom" />
            {id === "all" && !data.permissions.canReadAll ? "My tasks" : label}
          </Link>
        ))}
      </nav>

      <form method="GET" className="grid gap-3 rounded-lg border bg-card p-4 sm:grid-cols-2 lg:grid-cols-[minmax(180px,1fr)_180px_180px_auto_auto]">
        <input type="hidden" name="view" value={view} />
        <label className="sr-only" htmlFor="task-search">Search tasks</label>
        <div className="relative min-w-0">
          <Search aria-hidden="true" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            id="task-search"
            name="search"
            defaultValue={search}
            placeholder="Search task or project"
            className="h-10 w-full min-w-0 rounded-md border border-input bg-background pl-9 pr-3 text-sm"
          />
        </div>
        <MultiSelect
          key={`task-status-${status.join(",")}`}
          name="status"
          label="Filter by status"
          options={taskStatusOptions}
          defaultValue={status}
          placeholder="All statuses"
          searchPlaceholder="Search statuses"
        />
        <MultiSelect
          key={`task-priority-${priority.join(",")}`}
          name="priority"
          label="Filter by priority"
          options={taskPriorityOptions}
          defaultValue={priority}
          placeholder="All priorities"
          searchPlaceholder="Search priorities"
        />
        <Button type="submit">
          <Search aria-hidden="true" />
          Apply
        </Button>
        <Button asChild variant="outline">
          <Link href={viewHref(view)}>Clear filters</Link>
        </Button>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Showing {data.items.length} of {data.total} matching task{data.total === 1 ? "" : "s"}
        </p>
        <div className="inline-flex rounded-lg border bg-card p-1" aria-label="Task layout">
          {(["list", "board"] as const).map((mode) => (
            <Button
              key={mode}
              type="button"
              size="sm"
              variant={layout === mode ? "secondary" : "ghost"}
              aria-pressed={layout === mode}
              className="capitalize"
              onClick={() => setLayout(mode)}
            >
              {mode === "list"
                ? <List aria-hidden="true" className="mr-1.5 size-4" />
                : <LayoutGrid aria-hidden="true" className="mr-1.5 size-4" />}
              {mode}
            </Button>
          ))}
        </div>
      </div>

      {data.items.length === 0 ? (
        <section className="rounded-lg border border-dashed bg-card px-6 py-12 text-center">
          <h2 className="font-semibold">No tasks in this view</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Try a different view or clear the filters. Tasks are created from their project workspace.
          </p>
        </section>
      ) : layout === "list" ? (
        <div className="space-y-3">
          {TASK_STATUS_GROUPS.map(({ id: group, label }) => {
            const groupedTasks = tasks.filter((task) => task.statusGroup === group);
            return (
              <details key={group} open className="overflow-hidden rounded-lg border bg-card">
                <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 px-4 py-2.5 outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
                  <span
                    aria-hidden="true"
                    className="size-2.5 shrink-0 rounded-full"
                    style={{
                      backgroundColor: group === "NOT_STARTED"
                        ? "#64748b"
                        : group === "ACTIVE"
                          ? "#2563eb"
                          : group === "DONE"
                            ? "#16a34a"
                            : "#71717a",
                    }}
                  />
                  <span className="font-medium">{label}</span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs tabular-nums text-muted-foreground">
                    {groupedTasks.length}
                  </span>
                </summary>
                {groupedTasks.length === 0 ? (
                  <p className="border-t px-4 py-4 text-sm text-muted-foreground">
                    No tasks in this group.
                  </p>
                ) : (
                  <div className="overflow-x-auto border-t">
                    <table className="w-full min-w-[640px] text-left text-sm">
                      <thead className="bg-muted/40 text-xs font-medium text-muted-foreground">
                        <tr>
                          <th scope="col" className="px-4 py-2.5">Task</th>
                          <th scope="col" className="hidden px-3 py-2.5 sm:table-cell">Assignee</th>
                          <th scope="col" className="hidden px-3 py-2.5 md:table-cell">Due date</th>
                          <th scope="col" className="hidden px-3 py-2.5 sm:table-cell">Priority</th>
                          <th scope="col" className="px-3 py-2.5">Status</th>
                          <th scope="col" className="px-3 py-2.5"><span className="sr-only">Details</span></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {groupedTasks.map((task) => (
                          <tr key={task.id} className="align-middle">
                            <th scope="row" className="max-w-[22rem] px-4 py-3 font-medium">
                              <button
                                type="button"
                                onClick={() => setSelectedTaskId(task.id)}
                                className="block max-w-full truncate text-left outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
                              >
                                {task.title}
                              </button>
                              <p className="mt-1 truncate text-xs font-normal text-muted-foreground">
                                {task.projectCode} · {task.project.name}
                              </p>
                            </th>
                            <td className="hidden max-w-36 truncate px-3 py-3 text-muted-foreground sm:table-cell">
                              {task.assignee?.name ?? "Unassigned"}
                            </td>
                            <td className={`hidden whitespace-nowrap px-3 py-3 md:table-cell ${isOverdue(task) ? "font-medium text-destructive" : "text-muted-foreground"}`}>
                              {formatDate(task.dueDate)}
                            </td>
                            <td className="hidden px-3 py-3 sm:table-cell">
                              <span className={task.priority === "URGENT" ? "font-medium text-destructive" : "text-muted-foreground"}>
                                {taskPriorityLabels[task.priority]}
                              </span>
                            </td>
                            <td className="px-3 py-3">
                              <div className="flex items-center gap-2">
                                <span
                                  aria-hidden="true"
                                  className="size-2.5 shrink-0 rounded-full"
                                  style={{
                                    backgroundColor: task.project.taskStatuses.find(
                                      ({ id }) => id === task.status,
                                    )?.color ?? "#64748b",
                                  }}
                                />
                                <OptionSelect
                                  label={`Status for ${task.title}`}
                                  value={task.status}
                                  disabled={!canUpdate(task) || pendingTaskId === task.id}
                                  onValueChange={(nextStatus) => changeStatus(task.id, nextStatus)}
                                  options={task.project.taskStatuses.map((statusOption) => ({
                                    value: statusOption.id,
                                    label: statusOption.name,
                                    icon: statusOption.group === "DONE"
                                      ? "completed"
                                      : statusOption.group === "CLOSED"
                                        ? "cancelled"
                                        : statusOption.group === "ACTIVE"
                                          ? "inProgress"
                                          : "notStarted",
                                  }))}
                                  className="h-9 min-w-32"
                                />
                              </div>
                            </td>
                            <td className="px-3 py-3">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedTaskId(task.id)}
                              >
                                Preview
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </details>
            );
          })}
        </div>
      ) : (
        <TaskStatusBoard
          items={tasks}
          statuses={boardStatuses}
          statusLabels={statusLabels}
          statusGroups={statusGroups}
          columnForTask={(task) => task.statusGroup}
          canMove={(task) => canUpdate(task) && pendingTaskId === null}
          onMove={(taskId, nextGroup) => void changeStatus(taskId, nextGroup, true)}
          renderTask={(task, dragHandle) => taskCard(task, dragHandle)}
        />
      )}

      {nextCursor && (
        <div className="flex justify-center">
          <Button asChild variant="outline">
            <Link href={viewHref(view, nextCursor)}>
              Load more tasks
            </Link>
          </Button>
        </div>
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
