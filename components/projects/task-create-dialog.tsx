"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CalendarDays,
  Clock3,
  Flag,
  FolderClosed,
  ListChecks,
  Plus,
} from "lucide-react";
import { createProjectTaskAction } from "@/actions/project";
import type { ProjectPriority } from "@/app/generated/prisma/enums";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OptionSelect } from "@/components/ui/option-select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { MultiSelectOption } from "@/components/ui/multi-select";

export type TaskComposerProject = {
  id: string;
  name: string;
  projectCode: string;
  projectManager: { id: string; name: string } | null;
  members: { id: string; name: string }[];
  taskStatuses: { id: string; name: string; group: string }[];
  taskFolders: { id: string; name: string; parentId: string | null }[];
};

const priorityOptions: MultiSelectOption[] = [
  { value: "URGENT", label: "Urgent", icon: "overdue" },
  { value: "HIGH", label: "High", icon: "flag" },
  { value: "MEDIUM", label: "Normal", icon: "flag" },
  { value: "LOW", label: "Low", icon: "flag" },
];
const taskPriorities: ProjectPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];

function folderLabel(
  folderId: string,
  folders: TaskComposerProject["taskFolders"],
) {
  const foldersById = new Map(folders.map((folder) => [folder.id, folder]));
  const parts: string[] = [];
  let current = foldersById.get(folderId);
  while (current) {
    parts.unshift(current.name);
    current = current.parentId ? foldersById.get(current.parentId) : undefined;
  }
  return parts.join(" / ");
}

function defaultStatus(project: TaskComposerProject | undefined) {
  return project?.taskStatuses.find(({ group }) => group === "NOT_STARTED")?.id ?? "";
}

function defaultFolder(project: TaskComposerProject | undefined) {
  return project?.taskFolders.find(({ name, parentId }) =>
    name === "General" && parentId === null,
  )?.id ?? project?.taskFolders.find(({ parentId }) => parentId === null)?.id ?? "";
}

export function TaskCreateDialog({
  projects,
  defaultProjectId,
  defaultFolderId,
  hasMoreProjects = false,
  buttonLabel = "Create task",
  compactOnMobile = false,
}: {
  projects: TaskComposerProject[];
  defaultProjectId?: string;
  defaultFolderId?: string | null;
  hasMoreProjects?: boolean;
  buttonLabel?: string;
  compactOnMobile?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [projectId, setProjectId] = React.useState(
    defaultProjectId ?? projects[0]?.id ?? "",
  );
  const [folderId, setFolderId] = React.useState(defaultFolderId ?? "");
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [assigneeId, setAssigneeId] = React.useState("");
  const [startDate, setStartDate] = React.useState("");
  const [dueDate, setDueDate] = React.useState("");
  const [priority, setPriority] = React.useState<ProjectPriority>("MEDIUM");
  const [estimateHours, setEstimateHours] = React.useState("");
  const [sprintPoints, setSprintPoints] = React.useState("");
  const [showMoreFields, setShowMoreFields] = React.useState(false);

  const project = projects.find(({ id }) => id === projectId);
  const assignees = [
    ...(project?.projectManager ? [project.projectManager] : []),
    ...(project?.members ?? []),
  ].filter((person, index, list) =>
    list.findIndex(({ id }) => id === person.id) === index,
  );
  const assigneeOptions: MultiSelectOption[] = assignees.map((person) => ({
    value: person.id,
    label: person.name,
    icon: "team",
  }));
  const folderOptions: MultiSelectOption[] = (project?.taskFolders ?? []).map((folder) => ({
    value: folder.id,
    label: folderLabel(folder.id, project?.taskFolders ?? []),
    icon: "project",
  }));
  const statusOptions: MultiSelectOption[] = (project?.taskStatuses ?? []).map((item) => ({
    value: item.id,
    label: item.name,
    icon: item.group === "DONE"
      ? "completed"
      : item.group === "CLOSED"
        ? "cancelled"
        : item.group === "ACTIVE"
          ? "inProgress"
          : "notStarted",
  }));

  function resetForm(nextProjectId = defaultProjectId ?? projects[0]?.id ?? "") {
    const nextProject = projects.find(({ id }) => id === nextProjectId);
    setProjectId(nextProjectId);
    setFolderId(defaultFolderId ?? defaultFolder(nextProject));
    setTitle("");
    setDescription("");
    setStatus(defaultStatus(nextProject));
    setAssigneeId("");
    setStartDate("");
    setDueDate("");
    setPriority("MEDIUM");
    setEstimateHours("");
    setSprintPoints("");
    setShowMoreFields(false);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!projectId || !folderId) {
      toast.error("Choose a project folder before creating the task.");
      return;
    }

    setPending(true);
    try {
      const estimate = estimateHours.trim() === "" ? null : Number(estimateHours);
      const points = sprintPoints.trim() === "" ? null : Number(sprintPoints);
      if (estimate !== null && (!Number.isFinite(estimate) || estimate < 0)) {
        toast.error("Enter a valid time estimate.");
        return;
      }
      if (points !== null && (!Number.isInteger(points) || points < 0 || points > 100)) {
        toast.error("Sprint points must be a whole number from 0 to 100.");
        return;
      }
      const result = await createProjectTaskAction({
        projectId,
        folderId,
        title,
        description: description || null,
        status: status || undefined,
        assigneeId: assigneeId || null,
        startDate: startDate || null,
        dueDate: dueDate || null,
        priority,
        timeEstimateMinutes: estimate === null ? null : Math.round(estimate * 60),
        sprintPoints: points,
      });
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      setOpen(false);
      resetForm();
      router.refresh();
    } catch (error) {
      console.error("Failed to create task", error);
      toast.error("Unable to create task.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen && !title) resetForm();
      }}
    >
      <DialogTrigger asChild>
        <Button
          type="button"
          aria-label={compactOnMobile ? buttonLabel : undefined}
          title={compactOnMobile ? buttonLabel : undefined}
          className={compactOnMobile ? "h-10 w-10 px-0 sm:h-9 sm:w-auto sm:px-2.5" : undefined}
        >
          <Plus aria-hidden="true" />
          <span className={compactOnMobile ? "hidden sm:inline" : undefined}>
            {buttonLabel}
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[min(90dvh,52rem)] max-w-3xl gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b px-5 py-3 sm:px-7">
          <div className="flex items-center gap-5">
            <DialogTitle className="border-b-2 border-foreground py-2 text-sm font-medium">
              Task
            </DialogTitle>
            <p className="text-sm text-muted-foreground">Create a task with its key details.</p>
          </div>
        </DialogHeader>

        <form onSubmit={submit} className="flex min-h-0 flex-col">
          <div className="min-h-0 space-y-5 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
            {projects.length === 0 ? (
              <p className="rounded-md border border-dashed p-5 text-sm text-muted-foreground">
                No available projects. Create tasks from an accessible project workspace.
              </p>
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  {projects.length > 1 ? (
                    <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
                      Project
                      <OptionSelect
                        label="Project"
                        value={projectId}
                        onValueChange={(nextProjectId) => {
                          const nextProject = projects.find(({ id }) => id === nextProjectId);
                          setProjectId(nextProjectId);
                          setFolderId(defaultFolder(nextProject));
                          setStatus(defaultStatus(nextProject));
                          setAssigneeId("");
                        }}
                        options={projects.map((option) => ({
                          value: option.id,
                          label: `${option.projectCode} · ${option.name}`,
                          icon: "project",
                        }))}
                      />
                    </label>
                  ) : (
                    <p className="flex items-center gap-2 self-end text-sm text-muted-foreground">
                      <FolderClosed aria-hidden="true" className="size-4" />
                      {project?.projectCode} · {project?.name}
                    </p>
                  )}
                  <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
                    Folder
                    <OptionSelect
                      label="Task folder"
                      value={folderId}
                      onValueChange={setFolderId}
                      options={folderOptions}
                      placeholder="Choose a folder"
                    />
                  </label>
                </div>

                <Input
                  autoFocus
                  required
                  maxLength={160}
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  aria-label="Task name"
                  placeholder="Task name"
                  className="h-12 border-0 px-0 text-xl font-semibold shadow-none placeholder:text-muted-foreground/70 focus-visible:ring-0 sm:text-2xl"
                />
                <Textarea
                  rows={4}
                  maxLength={3000}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  aria-label="Task description"
                  placeholder="Add a description or notes"
                  className="resize-y border-0 px-0 shadow-none focus-visible:ring-0"
                />

                <div className="grid gap-3 border-t pt-4 sm:grid-cols-2 lg:grid-cols-3">
                  <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
                    Status
                    <OptionSelect
                      label="Task status"
                      value={status}
                      onValueChange={setStatus}
                      options={statusOptions}
                    />
                  </label>
                  <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
                    Assignee
                    <OptionSelect
                      label="Task assignee"
                      value={assigneeId}
                      onValueChange={setAssigneeId}
                      emptyLabel="Unassigned"
                      options={assigneeOptions}
                    />
                  </label>
                  <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
                    Priority
                    <OptionSelect
                      label="Task priority"
                      value={priority}
                      onValueChange={(value) => {
                        const nextPriority = taskPriorities.find((item) => item === value);
                        if (nextPriority) setPriority(nextPriority);
                      }}
                      options={priorityOptions}
                    />
                  </label>
                  <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
                    Start date
                    <span className="relative">
                      <CalendarDays aria-hidden="true" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        type="date"
                        value={startDate}
                        onChange={(event) => setStartDate(event.target.value)}
                        className="pl-9"
                      />
                    </span>
                  </label>
                  <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
                    Due date
                    <span className="relative">
                      <CalendarDays aria-hidden="true" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        type="date"
                        value={dueDate}
                        onChange={(event) => setDueDate(event.target.value)}
                        className="pl-9"
                      />
                    </span>
                  </label>
                </div>

                <div className="border-t pt-3">
                  <button
                    type="button"
                    aria-expanded={showMoreFields}
                    onClick={() => setShowMoreFields((visible) => !visible)}
                    className="inline-flex items-center gap-2 rounded-md text-sm font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <ListChecks aria-hidden="true" className="size-4" />
                    {showMoreFields ? "Hide extra fields" : "More task fields"}
                  </button>
                  {showMoreFields && (
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
                        Time estimate (hours)
                        <span className="relative">
                          <Clock3 aria-hidden="true" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            type="number"
                            min="0"
                            step="0.25"
                            value={estimateHours}
                            onChange={(event) => setEstimateHours(event.target.value)}
                            className="pl-9"
                            placeholder="e.g. 2.5"
                          />
                        </span>
                      </label>
                      <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
                        Sprint points
                        <span className="relative">
                          <Flag aria-hidden="true" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="1"
                            value={sprintPoints}
                            onChange={(event) => setSprintPoints(event.target.value)}
                            className="pl-9"
                            placeholder="0–100"
                          />
                        </span>
                      </label>
                    </div>
                  )}
                </div>
                {hasMoreProjects && (
                  <p className="text-xs text-muted-foreground">
                    Showing the first 100 projects. Open another project to create a task there.
                  </p>
                )}
              </>
            )}
          </div>

          <div className="flex flex-col-reverse gap-3 border-t bg-muted/20 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={pending || projects.length === 0 || !title.trim() || !folderId}
            >
              {pending ? "Creating…" : "Create task"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
