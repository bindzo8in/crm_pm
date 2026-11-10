"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  addProjectTaskAttachmentAction,
  addProjectTaskChecklistItemAction,
  addProjectTaskCommentAction,
  addProjectTaskDependencyAction,
  createProjectTaskAction,
  getProjectTaskPreviewAction,
  removeProjectTaskAttachmentAction,
  removeProjectTaskChecklistItemAction,
  removeProjectTaskDependencyAction,
  startProjectTaskTimerAction,
  stopProjectTaskTimerAction,
  updateProjectTaskAction,
  updateProjectTaskChecklistItemAction,
} from "@/actions/project";
import { AssetUpload, type UploadedAsset } from "@/components/ui/asset-upload";
import type { ProjectPriority } from "@/app/generated/prisma/enums";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OptionSelect } from "@/components/ui/option-select";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { MultiSelectOption } from "@/components/ui/multi-select";
import { formatInIST } from "@/lib/date";
import {
  CalendarDays,
  Check,
  CheckSquare,
  Circle,
  Clock3,
  ExternalLink,
  FileText,
  Flag,
  Link2,
  ListChecks,
  LoaderCircle,
  MessageSquareText,
  Paperclip,
  Plus,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { toast } from "sonner";

type TaskPreviewData = NonNullable<
  Extract<
    Awaited<ReturnType<typeof getProjectTaskPreviewAction>>,
    { success: true }
  >["data"]
>;

type MutationResult = { success: boolean; message: string };

type Draft = {
  title: string;
  description: string;
  status: string;
  assigneeId: string;
  startDate: string;
  dueDate: string;
  priority: ProjectPriority;
  estimateHours: string;
  sprintPoints: string;
};

function toInputDate(value: Date | string | null) {
  if (!value) return "";
  return formatInIST(new Date(value), "yyyy-MM-dd");
}

function toDraft(task: TaskPreviewData): Draft {
  return {
    title: task.title,
    description: task.description ?? "",
    status: task.status,
    assigneeId: task.assigneeId ?? "",
    startDate: toInputDate(task.startDate),
    dueDate: toInputDate(task.dueDate),
    priority: task.priority,
    estimateHours: task.timeEstimateMinutes === null
      ? ""
      : String(task.timeEstimateMinutes / 60),
    sprintPoints: task.sprintPoints === null ? "" : String(task.sprintPoints),
  };
}

function formatDuration(seconds: number) {
  const totalMinutes = Math.floor(Math.max(0, seconds) / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

function displayDate(value: Date | string | null) {
  return value ? formatInIST(new Date(value), "d MMM yyyy") : "Not set";
}

function formatPersonField(value: string | null | undefined) {
  if (!value) return null;
  return value
    .toLocaleLowerCase()
    .split(/[\s_]+/)
    .map((part) => part.charAt(0).toLocaleUpperCase() + part.slice(1))
    .join(" ");
}

export function TaskPreviewDrawer({
  taskId,
  open,
  onOpenChange,
  onTaskSelect,
}: {
  taskId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTaskSelect: (taskId: string) => void;
}) {
  const router = useRouter();
  const [task, setTask] = React.useState<TaskPreviewData | null>(null);
  const [draft, setDraft] = React.useState<Draft | null>(null);
  const [loadedTaskId, setLoadedTaskId] = React.useState<string | null>(null);
  const [isPending, setIsPending] = React.useState(false);
  const [now, setNow] = React.useState(() => Date.now());
  const [subtaskTitle, setSubtaskTitle] = React.useState("");
  const [checklistTitle, setChecklistTitle] = React.useState("");
  const [dependencyTaskId, setDependencyTaskId] = React.useState("");
  const [dependencyRelationType, setDependencyRelationType] =
    React.useState<"BLOCKED_BY" | "RELATED_TO">("BLOCKED_BY");
  const [comment, setComment] = React.useState("");
  const attachmentRef = React.useRef<UploadedAsset[]>([]);
  const isLoading = open && taskId !== null && loadedTaskId !== taskId;

  const loadTask = React.useCallback(async () => {
    if (!taskId) return false;
    const result = await getProjectTaskPreviewAction({ taskId });
    if (!result.success || !result.data) {
      toast.error(result.message);
      return false;
    }
    setTask(result.data);
    setDraft(toDraft(result.data));
    attachmentRef.current = result.data.attachments.map((attachment) => ({
      url: attachment.url,
      publicId: attachment.publicId,
      resourceType: attachment.resourceType === "raw" ? "raw" : "image",
      fileName: attachment.fileName,
      fileSize: attachment.fileSize,
    }));
    return true;
  }, [taskId]);

  React.useEffect(() => {
    if (!open || !taskId) return;
    let active = true;
    void getProjectTaskPreviewAction({ taskId })
      .then((result) => {
        if (!active) return;
        if (!result.success || !result.data) {
          toast.error(result.message);
          setTask(null);
          setDraft(null);
          setLoadedTaskId(taskId);
          return;
        }
        setTask(result.data);
        setDraft(toDraft(result.data));
        setLoadedTaskId(taskId);
        attachmentRef.current = result.data.attachments.map((attachment) => ({
          url: attachment.url,
          publicId: attachment.publicId,
          resourceType: attachment.resourceType === "raw" ? "raw" : "image",
          fileName: attachment.fileName,
          fileSize: attachment.fileSize,
        }));
      })
      .catch((error: unknown) => {
        console.error("Failed to load task preview", error);
        if (active) {
          setLoadedTaskId(taskId);
          toast.error("Unable to load task details.");
        }
      });
    return () => {
      active = false;
    };
  }, [open, taskId]);

  React.useEffect(() => {
    if (!task?.timeEntries.some((entry) => !entry.endedAt)) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [task?.timeEntries]);

  async function runAction(action: Promise<MutationResult>, fallback: string) {
    setIsPending(true);
    try {
      const result = await action;
      if (!result.success) {
        toast.error(result.message);
        return false;
      }
      toast.success(result.message);
      await loadTask();
      router.refresh();
      return true;
    } catch (error) {
      console.error(fallback, error);
      toast.error(fallback);
      return false;
    } finally {
      setIsPending(false);
    }
  }

  async function saveTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!task || !draft) return;
    const hours = draft.estimateHours.trim() === "" ? null : Number(draft.estimateHours);
    const points = draft.sprintPoints.trim() === "" ? null : Number(draft.sprintPoints);
    if (hours !== null && (!Number.isFinite(hours) || hours < 0 || hours > 1666.66)) {
      toast.error("Enter a time estimate between 0 and 1,666 hours.");
      return;
    }
    if (points !== null && (!Number.isInteger(points) || points < 0 || points > 100)) {
      toast.error("Sprint points must be a whole number from 0 to 100.");
      return;
    }
    await runAction(
      updateProjectTaskAction({
        taskId: task.id,
        title: draft.title,
        description: draft.description,
        status: draft.status,
        assigneeId: draft.assigneeId || null,
        startDate: draft.startDate || null,
        dueDate: draft.dueDate || null,
        priority: draft.priority,
        timeEstimateMinutes: hours === null ? null : Math.round(hours * 60),
        sprintPoints: points,
      }),
      "Unable to save task changes.",
    );
  }

  async function addSubtask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!task || !subtaskTitle.trim()) return;
    const created = await runAction(
      createProjectTaskAction({
        projectId: task.projectId,
        parentTaskId: task.id,
        title: subtaskTitle,
      }),
      "Unable to add subtask.",
    );
    if (created) setSubtaskTitle("");
  }

  async function addChecklistItem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!task || !checklistTitle.trim()) return;
    const created = await runAction(
      addProjectTaskChecklistItemAction({ taskId: task.id, title: checklistTitle }),
      "Unable to add checklist item.",
    );
    if (created) setChecklistTitle("");
  }

  async function addDependency(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!task || !dependencyTaskId) return;
    const added = await runAction(
      addProjectTaskDependencyAction({
        taskId: task.id,
        dependsOnTaskId: dependencyTaskId,
        relationType: dependencyRelationType,
      }),
      "Unable to add dependency.",
    );
    if (added) {
      setDependencyTaskId("");
      setDependencyRelationType("BLOCKED_BY");
    }
  }

  async function addComment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!task || !comment.trim()) return;
    const added = await runAction(
      addProjectTaskCommentAction({ taskId: task.id, content: comment }),
      "Unable to add comment.",
    );
    if (added) setComment("");
  }

  async function updateAttachments(nextAssets: UploadedAsset[]) {
    if (!task) return;
    const previousAssets = attachmentRef.current;
    const nextPublicIds = new Set(nextAssets.map(({ publicId }) => publicId));
    const previousPublicIds = new Set(previousAssets.map(({ publicId }) => publicId));

    for (const asset of nextAssets) {
      if (previousPublicIds.has(asset.publicId)) continue;
      if (!asset.fileSize) throw new Error("The uploaded file size was not returned.");
      const result = await addProjectTaskAttachmentAction({
        taskId: task.id,
        url: asset.url,
        publicId: asset.publicId,
        resourceType: asset.resourceType,
        fileName: asset.fileName ?? "Uploaded file",
        fileSize: asset.fileSize,
      });
      if (!result.success) {
        try {
          await fetch("/api/uploads", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              scope: "task",
              ownerId: task.id,
              publicId: asset.publicId,
              resourceType: asset.resourceType,
            }),
          });
        } catch (error) {
          console.error("Failed to clean up an unlinked task attachment", error);
        }
        throw new Error(result.message);
      }
    }

    for (const attachment of task.attachments) {
      if (nextPublicIds.has(attachment.publicId)) continue;
      if (!previousPublicIds.has(attachment.publicId)) continue;
      const result = await removeProjectTaskAttachmentAction({
        taskId: task.id,
        attachmentId: attachment.id,
      });
      if (!result.success) throw new Error(result.message);
    }
    attachmentRef.current = nextAssets;
    await loadTask();
  }

  const statusOptions: MultiSelectOption[] = task?.project.taskStatuses.map((status) => ({
    value: status.id,
    label: status.name,
    icon: status.group === "DONE"
      ? "completed"
      : status.group === "CLOSED"
        ? "cancelled"
        : status.group === "ACTIVE"
          ? "inProgress"
          : "notStarted",
  })) ?? [];
  const taskAssignees = task
    ? [
        ...(task.project.projectManager ? [task.project.projectManager] : []),
        ...task.project.members.map(({ user }) => user),
        ...(task.assignee ? [task.assignee] : []),
      ].filter((person, index, people) =>
        people.findIndex(({ id }) => id === person.id) === index
      )
    : [];
  const assigneeOptions: MultiSelectOption[] = taskAssignees.map((person) => ({
    value: person.id,
    label: person.name,
    icon: "team",
  }));
  const selectedAssignee = taskAssignees.find(({ id }) => id === draft?.assigneeId);
  const selectedAssigneeDetails = selectedAssignee
    ? [formatPersonField(selectedAssignee.role), formatPersonField(selectedAssignee.department)]
        .filter((value): value is string => value !== null)
        .join(" · ")
    : null;
  const dependencyOptions: MultiSelectOption[] = task?.project.availableDependencies
    .filter((candidate) =>
      !task.dependencies.some(({ dependsOnTask }) => dependsOnTask.id === candidate.id)
    )
    .map((candidate) => ({
      value: candidate.id,
      label: candidate.title,
      icon: "notStarted",
    })) ?? [];
  const myRunningEntry = task?.timeEntries.find(
    (entry) => entry.userId === task.actorId && !entry.endedAt,
  );
  const liveSeconds = task
    ? task.timeEntries.reduce((total, entry) => {
        if (entry.endedAt) return total;
        return total + Math.max(0, Math.floor((now - new Date(entry.startedAt).getTime()) / 1000));
      }, 0)
    : 0;
  const totalTrackedSeconds = (task?.timeTrackedSeconds ?? 0) + liveSeconds;
  const completedChecklist = task?.checklist.filter(({ isComplete }) => isComplete).length ?? 0;
  const attachments: UploadedAsset[] = task?.attachments.map((attachment) => ({
    url: attachment.url,
    publicId: attachment.publicId,
    resourceType: attachment.resourceType === "raw" ? "raw" : "image",
    fileName: attachment.fileName,
    fileSize: attachment.fileSize,
  })) ?? [];

  return (
    <Sheet
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) setLoadedTaskId(null);
        onOpenChange(nextOpen);
      }}
    >
      <SheetContent
        side="right"
        className="w-full gap-0 overflow-hidden p-0 sm:max-w-[640px]"
      >
        <SheetHeader className="shrink-0 border-b px-5 py-4 pr-14">
          {task ? (
            <>
              <Link
                href={`/dashboard/projects/${task.project.id}`}
                className="flex w-fit items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                {task.project.projectCode} <span aria-hidden="true">/</span> {task.project.name}
                <ExternalLink aria-hidden="true" className="size-3" />
              </Link>
              <SheetTitle className="text-left text-xl leading-7">{task.title}</SheetTitle>
              <SheetDescription className="sr-only">
                View and manage task status, assignment, dates, and related work.
              </SheetDescription>
            </>
          ) : (
            <>
              <SheetTitle>Task preview</SheetTitle>
              <SheetDescription>Task details and related work.</SheetDescription>
            </>
          )}
        </SheetHeader>

        {isLoading || !task || !draft ? (
          <div className="flex flex-1 items-center justify-center">
            {isLoading ? (
              <LoaderCircle aria-label="Loading task" className="size-5 animate-spin text-muted-foreground" />
            ) : (
              <p className="px-6 text-center text-sm text-muted-foreground">
                Task details are unavailable. Close this panel and try again.
              </p>
            )}
          </div>
        ) : (
          <div className="min-h-0 min-w-0 flex-1 overflow-y-auto">
            <form onSubmit={(event) => void saveTask(event)} className="space-y-0">
              <div className="min-w-0 border-b px-4 py-4 sm:px-5">
                <label htmlFor="task-preview-title" className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Task title
                </label>
                <Input
                  id="task-preview-title"
                  value={draft.title}
                  onChange={(event) => setDraft((current) => current ? { ...current, title: event.target.value } : current)}
                  disabled={!task.permissions.canUpdate || isPending}
                  required
                  maxLength={160}
                  className="h-10 text-base font-medium"
                />
              </div>
              <div className="min-w-0 space-y-0 px-4 sm:px-5">
                <div className="grid min-w-0 grid-cols-1 items-start gap-y-2 border-b py-3 sm:grid-cols-[116px_minmax(0,1fr)] sm:items-center sm:gap-x-3">
                  <span className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Circle aria-hidden="true" className="size-4" /> Status
                  </span>
                  <OptionSelect
                    label="Task status"
                    value={draft.status}
                    disabled={!task.permissions.canUpdate || isPending}
                    onValueChange={(status) => setDraft((current) => current ? { ...current, status } : current)}
                    options={statusOptions}
                    className="h-9 w-full min-w-0 sm:w-fit sm:min-w-40"
                  />
                </div>
                <div className="grid min-w-0 grid-cols-1 items-start gap-y-2 border-b py-3 sm:grid-cols-[116px_minmax(0,1fr)] sm:items-center sm:gap-x-3">
                  <span className="flex items-center gap-2 text-sm text-muted-foreground">
                    <UserRound aria-hidden="true" className="size-4" /> Assignee
                  </span>
                  <div className="min-w-0">
                    <OptionSelect
                      label="Task assignee"
                      value={draft.assigneeId}
                      disabled={!task.permissions.canUpdate || isPending}
                      onValueChange={(assigneeId) => setDraft((current) => current ? { ...current, assigneeId } : current)}
                      emptyLabel="Unassigned"
                      options={assigneeOptions}
                      className="h-9 w-full min-w-0 sm:w-fit sm:min-w-40"
                    />
                    {selectedAssigneeDetails && (
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {selectedAssigneeDetails}
                      </p>
                    )}
                  </div>
                </div>
                <div className="grid min-w-0 grid-cols-1 items-start gap-y-2 border-b py-3 sm:grid-cols-[116px_minmax(0,1fr)] sm:items-center sm:gap-x-3">
                  <label htmlFor="task-start-date" className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CalendarDays aria-hidden="true" className="size-4" /> Start date
                  </label>
                  <Input
                    id="task-start-date"
                    type="date"
                    value={draft.startDate}
                    disabled={!task.permissions.canUpdate || isPending}
                    onChange={(event) => setDraft((current) => current ? { ...current, startDate: event.target.value } : current)}
                    className="h-9 text-sm text-foreground"
                  />
                </div>
                <div className="grid min-w-0 grid-cols-1 items-start gap-y-2 border-b py-3 sm:grid-cols-[116px_minmax(0,1fr)] sm:items-center sm:gap-x-3">
                  <label htmlFor="task-due-date" className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CalendarDays aria-hidden="true" className="size-4" /> Due date
                  </label>
                  <Input
                    id="task-due-date"
                    type="date"
                    value={draft.dueDate}
                    disabled={!task.permissions.canUpdate || isPending}
                    onChange={(event) => setDraft((current) => current ? { ...current, dueDate: event.target.value } : current)}
                    className="h-9 text-sm text-foreground"
                  />
                </div>
                <div className="grid min-w-0 grid-cols-1 items-start gap-y-2 border-b py-3 sm:grid-cols-[116px_minmax(0,1fr)] sm:items-center sm:gap-x-3">
                  <label htmlFor="task-priority" className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Flag aria-hidden="true" className="size-4 text-amber-500" /> Priority
                  </label>
                  <OptionSelect
                    label="Task priority"
                    value={draft.priority}
                    disabled={!task.permissions.canUpdate || isPending}
                    onValueChange={(priority) => {
                      if (priority === "LOW" || priority === "MEDIUM" || priority === "HIGH" || priority === "URGENT") {
                        setDraft((current) => current ? { ...current, priority } : current);
                      }
                    }}
                    options={[
                      { value: "LOW", label: "Low", icon: "flag" },
                      { value: "MEDIUM", label: "Medium", icon: "flag" },
                      { value: "HIGH", label: "High", icon: "flag" },
                      { value: "URGENT", label: "Urgent", icon: "overdue" },
                    ]}
                    className="h-9 w-full min-w-0 sm:w-fit sm:min-w-40"
                  />
                </div>
                <div className="grid min-w-0 grid-cols-1 items-start gap-y-2 border-b py-3 sm:grid-cols-[116px_minmax(0,1fr)] sm:items-center sm:gap-x-3">
                  <label htmlFor="task-estimate" className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock3 aria-hidden="true" className="size-4" /> Time estimate
                  </label>
                  <div className="flex w-full min-w-0 max-w-56 items-center gap-2">
                    <Input
                      id="task-estimate"
                      type="number"
                      min="0"
                      max="1666.66"
                      step="0.25"
                      value={draft.estimateHours}
                      disabled={!task.permissions.canUpdate || isPending}
                      onChange={(event) => setDraft((current) => current ? { ...current, estimateHours: event.target.value } : current)}
                      placeholder="Not set"
                      className="h-9 min-w-0 flex-1"
                    />
                    <span className="text-sm text-muted-foreground">hours</span>
                  </div>
                </div>
                <div className="grid min-w-0 grid-cols-1 items-start gap-y-2 border-b py-3 sm:grid-cols-[116px_minmax(0,1fr)] sm:items-center sm:gap-x-3">
                  <label htmlFor="task-points" className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckSquare aria-hidden="true" className="size-4" /> Sprint points
                  </label>
                  <Input
                    id="task-points"
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={draft.sprintPoints}
                    disabled={!task.permissions.canUpdate || isPending}
                    onChange={(event) => setDraft((current) => current ? { ...current, sprintPoints: event.target.value } : current)}
                    placeholder="Not set"
                    className="h-9 w-full min-w-0 max-w-40"
                  />
                </div>
                {task.permissions.canTrackTime && (
                    <div className="grid min-w-0 grid-cols-1 items-start gap-y-2 border-b py-3 sm:grid-cols-[116px_minmax(0,1fr)] sm:items-center sm:gap-x-3">
                    <span className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock3 aria-hidden="true" className="size-4" /> Track time
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="min-w-16 font-medium tabular-nums">
                        {formatDuration(totalTrackedSeconds)}
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant={myRunningEntry ? "destructive" : "outline"}
                        disabled={isPending}
                        onClick={() => void runAction(
                          myRunningEntry
                            ? stopProjectTaskTimerAction({ taskId: task.id })
                            : startProjectTaskTimerAction({ taskId: task.id }),
                          myRunningEntry ? "Unable to stop timer." : "Unable to start timer.",
                        )}
                      >
                        {myRunningEntry ? "Stop timer" : "Start timer"}
                      </Button>
                      {myRunningEntry && <span className="text-xs text-muted-foreground">Timer running</span>}
                    </div>
                  </div>
                )}
              </div>

              <section className="min-w-0 space-y-2 border-b px-4 py-4 sm:px-5">
                <h3 className="text-sm font-medium">Description</h3>
                <Textarea
                  value={draft.description}
                  onChange={(event) => setDraft((current) => current ? { ...current, description: event.target.value } : current)}
                  disabled={!task.permissions.canUpdate || isPending}
                  rows={4}
                  maxLength={3000}
                  placeholder="Add a description or write down the outcome this task should deliver."
                  className="resize-y"
                />
              </section>

              {task.permissions.canUpdate && (
                <div className="flex justify-end border-b px-4 py-3 sm:px-5">
                  <Button type="submit" size="sm" disabled={isPending || !draft.title.trim()}>
                    {isPending ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" />}
                    Save changes
                  </Button>
                </div>
              )}
            </form>

            <section className="min-w-0 border-b px-4 py-4 sm:px-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="flex items-center gap-2 text-sm font-medium">
                  <ListChecks aria-hidden="true" className="size-4 text-muted-foreground" />
                  Subtasks
                </h3>
                {task.subtasks.length > 0 && (
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {task.subtasks.filter(({ statusGroup }) => statusGroup === "DONE").length}/{task.subtasks.length} complete
                  </span>
                )}
              </div>
              {task.subtasks.length > 0 ? (
                <ul className="divide-y">
                  {task.subtasks.map((subtask) => {
                    const status = task.project.taskStatuses.find(({ id }) => id === subtask.status);
                    return (
                      <li key={subtask.id} className="flex items-center gap-2 py-2.5">
                        <span
                          aria-hidden="true"
                          className="size-2 shrink-0 rounded-full"
                          style={{ backgroundColor: status?.color ?? "#64748b" }}
                        />
                        <button
                          type="button"
                          onClick={() => onTaskSelect(subtask.id)}
                          className="min-w-0 flex-1 truncate text-left text-sm hover:text-primary"
                        >
                          {subtask.title}
                        </button>
                        <span className="hidden max-w-24 truncate text-xs text-muted-foreground sm:block">
                          {subtask.assignee?.name ?? ""}
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {displayDate(subtask.dueDate)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="py-2 text-sm text-muted-foreground">
                  Break this task into smaller pieces when it helps.
                </p>
              )}
              {task.permissions.canCreateSubtasks && (
                <form onSubmit={(event) => void addSubtask(event)} className="mt-3 flex gap-2">
                  <Input
                    value={subtaskTitle}
                    onChange={(event) => setSubtaskTitle(event.target.value)}
                    maxLength={160}
                    placeholder="Add a subtask"
                    aria-label="Subtask title"
                    className="h-9"
                  />
                  <Button type="submit" size="sm" variant="outline" disabled={isPending || !subtaskTitle.trim()}>
                    <Plus aria-hidden="true" className="size-4" />
                    Add
                  </Button>
                </form>
              )}
            </section>

            <section className="border-b px-5 py-4">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-medium">
                <Link2 aria-hidden="true" className="size-4 text-muted-foreground" />
                Dependencies
              </h3>
              {task.dependencies.length > 0 && (
                <ul className="mb-3 space-y-2">
                  {task.dependencies.map(({ id, relationType, dependsOnTask }) => (
                    <li key={id} className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">
                        {relationType === "RELATED_TO"
                          ? "Related to"
                          : "Depends on"}
                      </span>
                      <button
                        type="button"
                        onClick={() => onTaskSelect(dependsOnTask.id)}
                        className="min-w-0 flex-1 truncate text-left hover:text-primary"
                      >
                        {dependsOnTask.title}
                      </button>
                      {task.permissions.canUpdate && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Remove dependency ${dependsOnTask.title}`}
                          disabled={isPending}
                          onClick={() => void runAction(
                            removeProjectTaskDependencyAction({
                              taskId: task.id,
                              dependencyId: id,
                            }),
                            "Unable to remove dependency.",
                          )}
                        >
                          <X aria-hidden="true" />
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {task.blockedTasks.length > 0 && (
                <ul className="mb-3 space-y-2">
                  {task.blockedTasks.map(({ id, task: blockedTask }) => (
                    <li key={id} className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">Blocks</span>
                      <button
                        type="button"
                        onClick={() => onTaskSelect(blockedTask.id)}
                        className="min-w-0 flex-1 truncate text-left hover:text-primary"
                      >
                        {blockedTask.title}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {task.dependencies.length === 0 && task.blockedTasks.length === 0 && (
                <p className="mb-3 text-sm text-muted-foreground">
                  No related tasks yet.
                </p>
              )}
              {task.permissions.canUpdate && dependencyOptions.length > 0 && (
                <form onSubmit={(event) => void addDependency(event)} className="flex gap-2">
                  <OptionSelect
                    label="Relationship type"
                    value={dependencyRelationType}
                    onValueChange={(value) => {
                      if (value === "BLOCKED_BY" || value === "RELATED_TO") {
                        setDependencyRelationType(value);
                      }
                    }}
                    options={[
                      { value: "BLOCKED_BY", label: "Depends on", icon: "notStarted" },
                      { value: "RELATED_TO", label: "Related to", icon: "project" },
                    ]}
                    className="h-9 w-36 shrink-0"
                  />
                  <OptionSelect
                    label="Related task"
                    value={dependencyTaskId}
                    onValueChange={setDependencyTaskId}
                    emptyLabel="Choose a task"
                    options={dependencyOptions}
                    className="h-9 min-w-0 flex-1"
                  />
                  <Button type="submit" size="sm" variant="outline" disabled={isPending || !dependencyTaskId}>
                    <Plus aria-hidden="true" className="size-4" />
                    Add
                  </Button>
                </form>
              )}
            </section>

            <section className="border-b px-5 py-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-sm font-medium">
                  <CheckSquare aria-hidden="true" className="size-4 text-muted-foreground" />
                  Checklist
                </h3>
                {task.checklist.length > 0 && (
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {completedChecklist}/{task.checklist.length}
                  </span>
                )}
              </div>
              {task.checklist.length > 0 && (
                <ul className="space-y-1">
                  {task.checklist.map((item) => (
                    <li key={item.id} className="group flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={item.isComplete}
                        disabled={!task.permissions.canUpdate || isPending}
                        aria-label={`Mark ${item.title} ${item.isComplete ? "incomplete" : "complete"}`}
                        onChange={(event) => void runAction(
                          updateProjectTaskChecklistItemAction({
                            taskId: task.id,
                            itemId: item.id,
                            isComplete: event.target.checked,
                          }),
                          "Unable to update checklist item.",
                        )}
                        className="size-4 accent-primary"
                      />
                      <span className={`min-w-0 flex-1 text-sm ${item.isComplete ? "text-muted-foreground line-through" : ""}`}>
                        {item.title}
                      </span>
                      {task.permissions.canUpdate && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="opacity-70 sm:opacity-0 sm:group-hover:opacity-100"
                          aria-label={`Remove ${item.title}`}
                          disabled={isPending}
                          onClick={() => void runAction(
                            removeProjectTaskChecklistItemAction({
                              taskId: task.id,
                              itemId: item.id,
                            }),
                            "Unable to remove checklist item.",
                          )}
                        >
                          <Trash2 aria-hidden="true" />
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {task.permissions.canUpdate && (
                <form onSubmit={(event) => void addChecklistItem(event)} className="mt-3 flex gap-2">
                  <Input
                    value={checklistTitle}
                    onChange={(event) => setChecklistTitle(event.target.value)}
                    maxLength={500}
                    placeholder="Add a checklist item"
                    aria-label="Checklist item title"
                    className="h-9"
                  />
                  <Button type="submit" size="sm" variant="outline" disabled={isPending || !checklistTitle.trim()}>
                    <Plus aria-hidden="true" className="size-4" />
                    Add
                  </Button>
                </form>
              )}
            </section>

            <section className="border-b px-5 py-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="flex items-center gap-2 text-sm font-medium">
                  <Paperclip aria-hidden="true" className="size-4 text-muted-foreground" />
                  Attachments
                  <span className="text-xs font-normal text-muted-foreground">{task.attachments.length}</span>
                </h3>
              </div>
              {task.permissions.canUpdate ? (
                <AssetUpload
                  scope="task"
                  ownerId={task.id}
                  value={attachments}
                  onChange={updateAttachments}
                  maxFiles={20}
                />
              ) : task.attachments.length > 0 ? (
                <ul className="divide-y rounded-md border">
                  {task.attachments.map((attachment) => (
                    <li key={attachment.id} className="flex items-center gap-3 px-3 py-2.5">
                      <FileText aria-hidden="true" className="size-4 text-muted-foreground" />
                      <a
                        href={attachment.url}
                        target="_blank"
                        rel="noreferrer"
                        className="min-w-0 flex-1 truncate text-sm underline-offset-4 hover:underline"
                      >
                        {attachment.fileName}
                      </a>
                      <span className="text-xs text-muted-foreground">
                        {(attachment.fileSize / 1024).toFixed(0)} KB
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No files attached.</p>
              )}
            </section>

            <section className="border-b px-5 py-4">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-medium">
                <MessageSquareText aria-hidden="true" className="size-4 text-muted-foreground" />
                Comments
                <span className="text-xs font-normal text-muted-foreground">{task.comments.length}</span>
              </h3>
              {task.comments.length > 0 ? (
                <ol className="space-y-4">
                  {[...task.comments].reverse().map((item) => (
                    <li key={item.id} className="flex gap-3">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                        {(item.author?.name ?? "U").slice(0, 1).toUpperCase()}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                          <span className="text-sm font-medium">{item.author?.name ?? "Former user"}</span>
                          <time className="text-xs text-muted-foreground">
                            {formatInIST(new Date(item.createdAt), "d MMM, h:mm a")}
                          </time>
                        </div>
                        <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6">{item.content}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="mb-3 text-sm text-muted-foreground">Keep the discussion attached to the work.</p>
              )}
              {task.permissions.canUpdate && (
                <form onSubmit={(event) => void addComment(event)} className="mt-4 grid gap-2">
                  <Textarea
                    value={comment}
                    onChange={(event) => setComment(event.target.value)}
                    rows={2}
                    maxLength={3000}
                    placeholder="Write a comment"
                    aria-label="Task comment"
                  />
                  <Button type="submit" size="sm" className="w-fit" disabled={isPending || !comment.trim()}>
                    <MessageSquareText aria-hidden="true" className="size-4" />
                    Comment
                  </Button>
                </form>
              )}
            </section>

            <footer className="px-5 py-4 text-xs text-muted-foreground">
              Created by {task.createdBy?.name ?? "Former user"} on {displayDate(task.createdAt)}
              {task.parentTask && (
                <p className="mt-1">
                  Subtask of{" "}
                  <button
                    type="button"
                    onClick={() => onTaskSelect(task.parentTask!.id)}
                    className="underline underline-offset-2 hover:text-foreground"
                  >
                    {task.parentTask.title}
                  </button>
                </p>
              )}
            </footer>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
