"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOptimistic, useState, useTransition, type ReactNode } from "react";
import { toast } from "sonner";
import {
  createProjectTaskAction,
  updateProjectTaskAction,
} from "@/actions/project";
import type { ProjectPriority } from "@/app/generated/prisma/enums";
import {
  isTaskStatusTerminal,
  TASK_STATUS_GROUPS,
  type TaskStatusGroup,
} from "@/lib/task-status";
import {
  Check,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  CircleAlert,
  CircleDashed,
  Clock3,
  Flag,
  FilePlus2,
  Filter,
  FolderKanban,
  GripVertical,
  LayoutGrid,
  List,
  ListTodo,
  Plus,
  Search,
  UserRound,
  X,
} from "lucide-react";
import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { getProjectTaskWorkspace } from "@/actions/project";
import { formatInIST } from "@/lib/date";
import { TaskStatusBoard } from "@/components/projects/task-status-board";
import {
  MultiSelect,
  type MultiSelectOption,
} from "@/components/ui/multi-select";
import { OptionSelect } from "@/components/ui/option-select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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

const taskPriorityClasses: Record<ProjectPriority, string> = {
  LOW: "bg-slate-500/10 text-slate-700 dark:text-slate-300",
  MEDIUM: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  HIGH: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  URGENT: "bg-destructive/10 text-destructive",
};

function TaskPriorityBadge({ priority }: { priority: ProjectPriority }) {
  return (
    <span
      aria-label={`Priority: ${taskPriorityLabels[priority]}`}
      title={`Priority: ${taskPriorityLabels[priority]}`}
      className={`inline-flex h-6 shrink-0 items-center gap-1 rounded-full px-2 text-[11px] font-medium ${taskPriorityClasses[priority]}`}
    >
      <Flag aria-hidden="true" className="size-3.5" />
      <span className="hidden sm:inline">{taskPriorityLabels[priority]}</span>
    </span>
  );
}

const taskPriorityOptions: MultiSelectOption[] = [
  { value: "LOW", label: "Low", icon: "flag" },
  { value: "MEDIUM", label: "Medium", icon: "flag" },
  { value: "HIGH", label: "High", icon: "flag" },
  { value: "URGENT", label: "Urgent", icon: "overdue" },
];

const taskViews: {
  id: TaskWorkspaceView;
  label: string;
  icon: typeof ListTodo;
  optionIcon: MultiSelectOption["icon"];
}[] = [
  { id: "all", label: "All tasks", icon: ListTodo, optionIcon: "planning" },
  { id: "assigned", label: "Assigned to me", icon: UserRound, optionIcon: "manager" },
  { id: "created", label: "Created by me", icon: FilePlus2, optionIcon: "project" },
  { id: "upcoming", label: "Upcoming", icon: CalendarDays, optionIcon: "calendar" },
  { id: "overdue", label: "Overdue", icon: CircleAlert, optionIcon: "overdue" },
  { id: "completed", label: "Completed", icon: CheckCircle2, optionIcon: "completed" },
];

function formatDate(value: Date | string | null) {
  if (!value) return "No due date";
  return formatInIST(new Date(value), "d MMM yyyy");
}

function isOverdue(task: {
  dueDate: Date | string | null;
  statusGroup: TaskStatusGroup;
}) {
  if (!task.dueDate || isTaskStatusTerminal(task.statusGroup)) return false;
  return formatInIST(new Date(task.dueDate), "yyyy-MM-dd") <
    formatInIST(new Date(), "yyyy-MM-dd");
}

function getTaskStatusColor(task: {
  status: string;
  project: { taskStatuses: { id: string; color: string | null }[] };
}) {
  return task.project.taskStatuses.find(({ id }) => id === task.status)?.color ?? undefined;
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

function formatPersonField(value: string | null | undefined) {
  if (!value) return null;
  return value
    .toLocaleLowerCase()
    .split(/[\s_]+/)
    .map((part) => part.charAt(0).toLocaleUpperCase() + part.slice(1))
    .join(" ");
}

function getPersonDetails(person: {
  role?: string | null;
  department?: string | null;
}) {
  return [formatPersonField(person.role), formatPersonField(person.department)]
    .filter((value): value is string => value !== null)
    .join(" · ");
}

function TaskAssigneePicker({
  task,
  actorId,
  disabled,
  onSelect,
}: {
  task: TaskWorkspaceData["items"][number];
  actorId: string;
  disabled: boolean;
  onSelect: (assigneeId: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const people = [
    ...(task.project.projectManager ? [task.project.projectManager] : []),
    ...task.project.members.map(({ user }) => user),
    ...(task.assignee ? [task.assignee] : []),
  ].filter((person, index, list) =>
    list.findIndex(({ id }) => id === person.id) === index,
  );
  const visiblePeople = people.filter(({ name }) =>
    name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()),
  );
  const currentPerson = people.find(({ id }) => id === task.assigneeId);
  const currentLabel = currentPerson?.id === actorId
    ? `${currentPerson.name} (you)`
    : currentPerson?.name ?? "Unassigned";

  function choosePerson(assigneeId: string | null) {
    setOpen(false);
    setSearch("");
    onSelect(assigneeId);
  }

  const trigger = (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="size-10 rounded-full p-0"
      aria-label={`Assignee: ${currentLabel}${disabled ? "" : ". Change assignee"}`}
      title={currentLabel}
      disabled={disabled}
    >
      {currentPerson ? (
        <Avatar className="size-8">
          <AvatarFallback className="bg-secondary text-xs font-medium text-secondary-foreground">
            {getInitials(currentPerson.name)}
          </AvatarFallback>
        </Avatar>
      ) : (
        <span className="flex size-8 items-center justify-center rounded-full border border-dashed text-muted-foreground">
          <UserRound aria-hidden="true" className="size-4" />
        </span>
      )}
    </Button>
  );

  if (disabled) return trigger;

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) setSearch("");
      }}
    >
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        align="start"
        side="bottom"
        className="w-[min(20rem,calc(100vw-2rem))] gap-3 p-2"
      >
        <label className="relative block">
          <Search
            aria-hidden="true"
            className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            autoFocus
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search project people"
            aria-label="Search project people"
            className="pl-8"
          />
        </label>
        <div className="max-h-60 space-y-3 overflow-y-auto">
          <section aria-label="Current assignee">
            <h3 className="px-2 pb-1 text-xs font-medium text-muted-foreground">
              Assignee
            </h3>
            <button
              type="button"
              aria-pressed={!task.assigneeId}
              onClick={() => choosePerson(null)}
              className="flex min-h-10 w-full items-center gap-2 rounded-md px-2 text-left text-sm outline-none hover:bg-accent focus-visible:bg-accent"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-dashed text-muted-foreground">
                <UserRound aria-hidden="true" className="size-4" />
              </span>
              <span className="min-w-0 flex-1 truncate">Unassigned</span>
              {!task.assigneeId && <Check aria-hidden="true" className="size-4 text-primary" />}
            </button>
            {currentPerson && (
              <button
                type="button"
                aria-pressed
                onClick={() => choosePerson(currentPerson.id)}
                className="flex min-h-10 w-full items-center gap-2 rounded-md bg-accent px-2 text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Avatar className="size-8">
                  <AvatarFallback className="bg-secondary text-xs font-medium text-secondary-foreground">
                    {getInitials(currentPerson.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="flex min-w-0 flex-1 flex-col items-start">
                  <span className="max-w-full truncate">{currentLabel}</span>
                  {getPersonDetails(currentPerson) && (
                    <span className="max-w-full truncate text-xs text-muted-foreground">
                      {getPersonDetails(currentPerson)}
                    </span>
                  )}
                </span>
                <Check aria-hidden="true" className="size-4 text-primary" />
              </button>
            )}
          </section>
          <section aria-label="Project people">
            <h3 className="px-2 pb-1 text-xs font-medium text-muted-foreground">
              People
            </h3>
            {visiblePeople.filter(({ id }) => id !== task.assigneeId).length > 0 ? (
              visiblePeople.filter(({ id }) => id !== task.assigneeId).map((person) => (
                <button
                  key={person.id}
                  type="button"
                  aria-pressed={false}
                  onClick={() => choosePerson(person.id)}
                  className="flex min-h-10 w-full items-center gap-2 rounded-md px-2 text-left text-sm outline-none hover:bg-accent focus-visible:bg-accent"
                >
                  <Avatar className="size-8">
                    <AvatarFallback className="bg-muted text-xs text-muted-foreground">
                      {getInitials(person.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="flex min-w-0 flex-1 flex-col items-start">
                    <span className="max-w-full truncate">{person.name}</span>
                    {getPersonDetails(person) && (
                      <span className="max-w-full truncate text-xs text-muted-foreground">
                        {getPersonDetails(person)}
                      </span>
                    )}
                  </span>
                </button>
              ))
            ) : (
              <p className="px-2 py-2 text-xs text-muted-foreground">
                {search ? "No matching people." : "No other project people."}
              </p>
            )}
          </section>
        </div>
      </PopoverContent>
    </Popover>
  );
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
  const [filtersOpen, setFiltersOpen] = useState(
    Boolean(search || status.length || priority.length),
  );
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [expandedTaskIds, setExpandedTaskIds] = useState<Set<string>>(() => new Set());
  const [addingSubtaskTaskId, setAddingSubtaskTaskId] = useState<string | null>(null);
  const [subtaskTitle, setSubtaskTitle] = useState("");
  const [creatingSubtask, setCreatingSubtask] = useState(false);
  const [tasks, setOptimisticStatus] = useOptimistic(
    data.items,
    (
      currentTasks,
      update: { taskId: string; status: string; statusGroup: TaskStatusGroup },
    ) => currentTasks.map((task) => {
      if (task.id === update.taskId) {
        return { ...task, status: update.status, statusGroup: update.statusGroup };
      }
      return {
        ...task,
        subtasks: task.subtasks.map((subtask) =>
          subtask.id === update.taskId
            ? { ...subtask, status: update.status, statusGroup: update.statusGroup }
            : subtask,
        ),
      };
    }),
  );
  const [, startTransition] = useTransition();
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null);

  function findTask(taskId: string) {
    for (const task of tasks) {
      if (task.id === taskId) return task;
      const subtask = task.subtasks.find((candidate) => candidate.id === taskId);
      if (subtask) return { ...task, ...subtask };
    }
    return undefined;
  }

  function changeStatus(taskId: string, value: string, byGroup = false) {
    const task = findTask(taskId);
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

  async function changeAssignee(taskId: string, assigneeId: string | null) {
    const task = findTask(taskId);
    if (!task || task.assigneeId === assigneeId || !data.permissions.canUpdateTasks) return;

    setPendingTaskId(taskId);
    try {
      const result = await updateProjectTaskAction({ taskId, assigneeId });
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success("Task assignee updated.");
      router.refresh();
    } catch (error) {
      console.error("Failed to update task assignee", error);
      toast.error("Unable to update task assignee.");
    } finally {
      setPendingTaskId(null);
    }
  }

  function toggleSubtasks(taskId: string) {
    setExpandedTaskIds((current) => {
      const next = new Set(current);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  }

  function openSubtaskForm(taskId: string) {
    setExpandedTaskIds((current) => new Set(current).add(taskId));
    setAddingSubtaskTaskId(taskId);
    setSubtaskTitle("");
  }

  async function addSubtask(event: React.FormEvent<HTMLFormElement>, taskId: string) {
    event.preventDefault();
    const parentTask = tasks.find(({ id }) => id === taskId);
    const title = subtaskTitle.trim();
    if (!parentTask || !title || creatingSubtask) return;

    setCreatingSubtask(true);
    try {
      const result = await createProjectTaskAction({
        projectId: parentTask.project.id,
        parentTaskId: parentTask.id,
        title,
      });
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success("Subtask added.");
      setSubtaskTitle("");
      setAddingSubtaskTaskId(null);
      router.refresh();
    } catch (error) {
      console.error("Failed to add subtask", error);
      toast.error("Unable to add subtask.");
    } finally {
      setCreatingSubtask(false);
    }
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
        color: definition.color,
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
      color: definition?.color,
    });
  }
  const taskStatusOptions = [...taskStatusOptionMap.values()]
    .sort((left, right) => left.label.localeCompare(right.label));
  const statusLabels = Object.fromEntries(TASK_STATUS_GROUPS.map(({ id, label }) => [id, label]));
  const statusGroups = Object.fromEntries(TASK_STATUS_GROUPS.map(({ id }) => [id, id]));
  const boardStatuses = TASK_STATUS_GROUPS.map(({ id }) => id);
  const taskStatusColors = {
    NOT_STARTED: "#64748b",
    ACTIVE: "#2563eb",
    DONE: "#16a34a",
    CLOSED: "#71717a",
  };
  const boardTasks = tasks.flatMap((task) => [
    task,
    ...task.subtasks.map((subtask) => ({
      ...task,
      ...subtask,
      subtasks: [],
    })),
  ]);
  const activeFilterCount = [search, ...status, ...priority].filter(Boolean).length;

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
          <div className="flex shrink-0 items-center gap-2">
            {dragHandle}
            <TaskPriorityBadge priority={task.priority} />
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
          <div className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: getTaskStatusColor(task) }}
            />
            <OptionSelect
              label={`Status for ${task.title}`}
              value={task.status}
              disabled={!canUpdate(task) || pendingTaskId === task.id}
              onValueChange={(nextStatus) => changeStatus(task.id, nextStatus)}
              options={task.project.taskStatuses.map((statusOption) => ({
                value: statusOption.id,
                label: statusOption.name,
                color: statusOption.color,
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
        </div>
      </article>
    );
  }

  return (
    <div className="space-y-5">
      <header className="flex min-w-0 items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight sm:text-2xl">
            <ListTodo aria-hidden="true" className="size-5 shrink-0 text-primary sm:size-6" />
            Tasks
          </h1>
          <p className="mt-1 hidden max-w-2xl text-sm text-muted-foreground md:block">
            Keep the next action visible across your projects.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {data.permissions.canCreateTasks && (
            <TaskCreateDialog
              projects={projectOptions}
              defaultProjectId={projectOptions[0]?.id}
              hasMoreProjects={hasMoreProjects}
              compactOnMobile
            />
          )}
          <Button asChild variant="outline" className="hidden sm:inline-flex">
            <Link href="/dashboard/projects">
              <FolderKanban aria-hidden="true" />
              Browse projects
            </Link>
          </Button>
        </div>
      </header>

      <section aria-label="Task summary" className="hidden grid-cols-2 gap-2 sm:grid sm:grid-cols-3 sm:gap-3 xl:grid-cols-5">
        {[
          { label: data.permissions.canReadAll ? "All tasks" : "My tasks", count: data.summary.total, icon: ListTodo },
          { label: "Open", count: data.summary.open, icon: CircleDashed },
          { label: "Active", count: data.summary.active, icon: Clock3 },
          { label: "Completed", count: data.summary.completed, icon: CheckCircle2 },
          { label: "Overdue", count: data.summary.overdue, icon: CircleAlert },
        ].map(({ label, count, icon: SummaryIcon }) => (
          <article key={label} className="flex min-w-0 items-center justify-between gap-2 rounded-lg border bg-card px-3 py-2.5 sm:px-4">
            <p className="flex min-w-0 items-center gap-2 truncate text-xs text-muted-foreground sm:text-sm">
              <SummaryIcon aria-hidden="true" className="size-4 shrink-0" />
              <span className="truncate">{label}</span>
            </p>
            <p className="shrink-0 text-lg font-semibold tabular-nums sm:text-xl">{count}</p>
          </article>
        ))}
      </section>

      <div className="flex items-center gap-2 lg:hidden">
        <OptionSelect
          label="Task view"
          value={view}
          onValueChange={(value) => {
            const nextView = taskViews.find((taskView) => taskView.id === value)?.id;
            if (nextView) router.push(viewHref(nextView));
          }}
          options={taskViews.map(({ id, label, optionIcon }) => ({
            value: id,
            label: id === "all" && !data.permissions.canReadAll ? "My tasks" : label,
            icon: optionIcon,
          }))}
          className="h-10 min-w-0 flex-1"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={activeFilterCount ? `Filters, ${activeFilterCount} active` : "Filters"}
          aria-expanded={filtersOpen}
          aria-controls="task-filters"
          title="Filters"
          className="relative size-10 shrink-0"
          onClick={() => setFiltersOpen((open) => !open)}
        >
          <Filter aria-hidden="true" />
          {activeFilterCount > 0 && (
            <span
              aria-hidden="true"
              className="absolute right-1 top-1 size-2 rounded-full bg-primary"
            />
          )}
        </Button>
      </div>
      <nav aria-label="Task views" className="hidden flex-wrap gap-1 pb-1 lg:flex">
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

      <form
        id="task-filters"
        method="GET"
        className={`${filtersOpen ? "grid" : "hidden"} grid-cols-2 gap-2 rounded-lg border bg-card p-3 sm:grid sm:gap-3 sm:p-4 lg:grid-cols-[minmax(180px,1fr)_180px_180px_auto_auto]`}
      >
        <input type="hidden" name="view" value={view} />
        <label className="sr-only" htmlFor="task-search">Search tasks</label>
        <div className="relative col-span-2 min-w-0 lg:col-span-1">
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

      <div className="flex min-w-0 items-center justify-between gap-2 sm:gap-3">
        <p className="min-w-0 whitespace-nowrap text-xs text-muted-foreground sm:text-sm">
          <span className="sm:hidden">{data.items.length} / {data.total} tasks</span>
          <span className="hidden sm:inline">
            Showing {data.items.length} of {data.total} matching task{data.total === 1 ? "" : "s"}
          </span>
        </p>
        <div className="inline-flex rounded-lg border bg-card p-1" role="group" aria-label="Task layout">
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
                ? <List aria-hidden="true" className="size-4 sm:mr-1.5" />
                : <LayoutGrid aria-hidden="true" className="size-4 sm:mr-1.5" />}
              <span className="hidden sm:inline">{mode}</span>
              <span className="sr-only sm:hidden">{mode}</span>
            </Button>
          ))}
        </div>
        {data.items.length > 0 && (
          <p className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
            <GripVertical aria-hidden="true" className="size-4" />
            Drag the grip to change a task&apos;s status.
          </p>
        )}
      </div>

      {data.items.length === 0 ? (
        <section className="rounded-lg border border-dashed bg-card px-6 py-12 text-center">
          <h2 className="font-semibold">No tasks in this view</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Try a different view or clear the filters. Tasks are created from their project workspace.
          </p>
        </section>
      ) : layout === "list" ? (
        <TaskStatusBoard
          id="global-task-list"
          layout="list"
          items={tasks}
          statuses={boardStatuses}
          statusLabels={statusLabels}
          statusGroups={statusGroups}
          statusColors={taskStatusColors}
          columnForTask={(task) => task.statusGroup}
          canMove={(task) => canUpdate(task) && pendingTaskId === null}
          onMove={(taskId, nextGroup) => void changeStatus(taskId, nextGroup, true)}
          renderTask={(task, dragHandle) => {
            const expanded = expandedTaskIds.has(task.id);
            const addingSubtask = addingSubtaskTaskId === task.id;
            const subtaskListId = `task-subtasks-${task.id}`;

            return (
              <article key={task.id} className="min-w-0 py-2">
                <div className="flex min-w-0 items-center gap-1.5 px-1.5 sm:gap-3 sm:px-3">
                  {dragHandle}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    aria-label={`${expanded ? "Hide" : "Show"} subtasks for ${task.title}`}
                    aria-expanded={expanded}
                    aria-controls={subtaskListId}
                    title={`${task.subtasks.length} subtasks`}
                    className="size-8 shrink-0"
                    onClick={() => toggleSubtasks(task.id)}
                  >
                    {expanded
                      ? <ChevronDown aria-hidden="true" />
                      : <ChevronRight aria-hidden="true" />}
                  </Button>
                  <span
                    aria-hidden="true"
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: getTaskStatusColor(task) }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setSelectedTaskId(task.id)}
                        className="line-clamp-2 min-w-0 flex-1 text-left text-sm font-medium outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {task.title}
                      </button>
                      {data.permissions.canCreateTasks && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          aria-label={`Add subtask to ${task.title}`}
                          title="Add subtask"
                          className="size-8 shrink-0 text-muted-foreground"
                          onClick={() => openSubtaskForm(task.id)}
                        >
                          <Plus aria-hidden="true" />
                        </Button>
                      )}
                    </div>
                    <div className="mt-1 flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
                      {data.permissions.canReadAllProjects ? (
                        <Link
                          href={`/dashboard/projects/${task.project.id}`}
                          className="min-w-0 truncate underline-offset-4 hover:text-foreground hover:underline"
                        >
                          {task.projectCode} · {task.project.name}
                        </Link>
                      ) : (
                        <span className="min-w-0 truncate">
                          {task.projectCode} · {task.project.name}
                        </span>
                      )}
                      <span className="hidden shrink-0 items-center gap-1 sm:inline-flex">
                        <UserRound aria-hidden="true" className="size-3.5" />
                        {task.assignee?.name ?? "Unassigned"}
                      </span>
                      <span className={`hidden shrink-0 items-center gap-1 sm:inline-flex ${
                        isOverdue(task) ? "font-medium text-destructive" : ""
                      }`}>
                        <CalendarDays aria-hidden="true" className="size-3.5" />
                        {formatDate(task.dueDate)}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground sm:hidden">
                      <TaskAssigneePicker
                        task={task}
                        actorId={data.actorId}
                        disabled={!data.permissions.canUpdateTasks || pendingTaskId === task.id}
                        onSelect={(assigneeId) => void changeAssignee(task.id, assigneeId)}
                      />
                      <span className={`flex shrink-0 items-center gap-1 ${
                        isOverdue(task) ? "font-medium text-destructive" : ""
                      }`}>
                        <CalendarDays aria-hidden="true" className="size-3.5 shrink-0" />
                        {formatDate(task.dueDate)}
                      </span>
                    </div>
                  </div>
                  <OptionSelect
                    label={`Status for ${task.title}`}
                    value={task.status}
                    disabled={!canUpdate(task) || pendingTaskId === task.id}
                    onValueChange={(nextStatus) => changeStatus(task.id, nextStatus)}
                    options={task.project.taskStatuses.map((statusOption) => ({
                      value: statusOption.id,
                      label: statusOption.name,
                      color: statusOption.color,
                      icon: statusOption.group === "DONE"
                        ? "completed"
                        : statusOption.group === "CLOSED"
                          ? "cancelled"
                          : statusOption.group === "ACTIVE"
                            ? "inProgress"
                            : "notStarted",
                    }))}
                    className="h-11 w-[104px] shrink-0 text-xs sm:h-9 sm:w-40"
                  />
                </div>

                {expanded && (
                  <div
                    id={subtaskListId}
                    className="ml-12 mr-2 mt-1 border-l border-border/70 pl-3 sm:ml-16 sm:pl-4"
                  >
                    {task.subtasks.map((subtask) => (
                      <div
                        key={subtask.id}
                        className="flex min-w-0 items-center gap-2 border-b border-border/40 py-2 last:border-b-0"
                      >
                        <span
                          aria-hidden="true"
                          className="size-2 shrink-0 rounded-full"
                          style={{
                            backgroundColor: task.project.taskStatuses.find(
                              ({ id }) => id === subtask.status,
                            )?.color,
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setSelectedTaskId(subtask.id)}
                          className="min-w-0 flex-1 truncate text-left text-sm outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          {subtask.title}
                        </button>
                        <span className="hidden max-w-28 truncate text-xs text-muted-foreground sm:block">
                          {subtask.assignee?.name ?? "Unassigned"}
                        </span>
                        <span className={`hidden shrink-0 text-xs text-muted-foreground md:block ${
                          isOverdue(subtask) ? "font-medium text-destructive" : ""
                        }`}>
                          {formatDate(subtask.dueDate)}
                        </span>
                        <OptionSelect
                          label={`Status for ${subtask.title}`}
                          value={subtask.status}
                          disabled={!canUpdate({ ...task, ...subtask }) || pendingTaskId === subtask.id}
                          onValueChange={(nextStatus) => changeStatus(subtask.id, nextStatus)}
                          options={task.project.taskStatuses.map((statusOption) => ({
                            value: statusOption.id,
                            label: statusOption.name,
                            color: statusOption.color,
                            icon: statusOption.group === "DONE"
                              ? "completed"
                              : statusOption.group === "CLOSED"
                                ? "cancelled"
                                : statusOption.group === "ACTIVE"
                                  ? "inProgress"
                                  : "notStarted",
                          }))}
                          className="h-8 w-[104px] shrink-0 text-xs sm:w-40"
                        />
                      </div>
                    ))}
                    {task.subtasks.length === 0 && !addingSubtask && (
                      <p className="py-2 text-xs text-muted-foreground">
                        No subtasks yet.
                      </p>
                    )}
                    {addingSubtask && (
                      <form
                        className="flex min-w-0 items-center gap-2 py-2"
                        onSubmit={(event) => void addSubtask(event, task.id)}
                      >
                        <Input
                          autoFocus
                          value={subtaskTitle}
                          onChange={(event) => setSubtaskTitle(event.target.value)}
                          maxLength={160}
                          aria-label={`New subtask for ${task.title}`}
                          placeholder="Name this subtask"
                          className="h-9 min-w-0 flex-1"
                        />
                        <Button
                          type="submit"
                          size="sm"
                          disabled={creatingSubtask || !subtaskTitle.trim()}
                        >
                          {creatingSubtask ? "Adding..." : "Add"}
                        </Button>
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="ghost"
                          aria-label="Cancel adding subtask"
                          disabled={creatingSubtask}
                          onClick={() => {
                            setAddingSubtaskTaskId(null);
                            setSubtaskTitle("");
                          }}
                        >
                          <X aria-hidden="true" />
                        </Button>
                      </form>
                    )}
                  </div>
                )}
              </article>
            );
          }}
        />
      ) : (
        <TaskStatusBoard
          id="global-task-board"
          items={boardTasks}
          statuses={boardStatuses}
          statusLabels={statusLabels}
          statusGroups={statusGroups}
          statusColors={taskStatusColors}
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
