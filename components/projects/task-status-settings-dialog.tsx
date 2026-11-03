"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  getTaskStatusTemplatesAction,
  saveTaskStatusTemplateAction,
  updateProjectTaskWorkflowAction,
} from "@/actions/project";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { MultiSelectOption } from "@/components/ui/multi-select";
import { OptionSelect } from "@/components/ui/option-select";
import {
  TASK_STATUS_GROUPS,
  taskWorkflowStatusesSchema,
  type TaskStatusGroup,
  type TaskWorkflowStatus,
} from "@/lib/task-status";
import { Settings2, Plus, Trash2 } from "lucide-react";

type StatusTemplate = {
  id: string;
  name: string;
  statuses: TaskWorkflowStatus[];
  isSystem: boolean;
};

const groupOptions: MultiSelectOption[] = TASK_STATUS_GROUPS.map(({ id, label }) => ({
  value: id,
  label,
  icon: id === "DONE"
    ? "completed"
    : id === "CLOSED"
      ? "cancelled"
      : id === "ACTIVE"
        ? "inProgress"
        : "notStarted",
}));

export function TaskStatusSettingsDialog({
  projectId,
  initialStatuses,
  initialTemplateId,
}: {
  projectId: string;
  initialStatuses: TaskWorkflowStatus[];
  initialTemplateId: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [statuses, setStatuses] = useState(initialStatuses);
  const [templateId, setTemplateId] = useState(initialTemplateId ?? "");
  const [templates, setTemplates] = useState<StatusTemplate[]>([]);
  const [templateName, setTemplateName] = useState("");
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [savingWorkflow, setSavingWorkflow] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const workflowValidation = taskWorkflowStatusesSchema.safeParse(statuses);

  async function openSettings() {
    setStatuses(initialStatuses);
    setTemplateId(initialTemplateId ?? "");
    setOpen(true);
    setLoadingTemplates(true);
    try {
      const result = await getTaskStatusTemplatesAction(projectId);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      setTemplates(result.data ?? []);
    } catch (error) {
      console.error("Failed to load task status templates", error);
      toast.error("Unable to load task status templates.");
    } finally {
      setLoadingTemplates(false);
    }
  }

  function updateStatus(statusId: string, changes: Partial<TaskWorkflowStatus>) {
    setTemplateId("");
    setStatuses((current) =>
      current.map((status) =>
        status.id === statusId ? { ...status, ...changes } : status,
      ),
    );
  }

  function addStatus(group: TaskStatusGroup) {
    const id = `CUSTOM_${crypto.randomUUID().replaceAll("-", "").toUpperCase()}`;
    setTemplateId("");
    setStatuses((current) => [
      ...current,
      { id, name: "New status", group, color: "#64748b" },
    ]);
  }

  function selectTemplate(id: string) {
    setTemplateId(id);
    const template = templates.find((item) => item.id === id);
    if (template) setStatuses(template.statuses);
  }

  async function applyWorkflow() {
    setSavingWorkflow(true);
    try {
      const result = await updateProjectTaskWorkflowAction({
        projectId,
        templateId: templateId || null,
        statuses,
      });
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      setOpen(false);
      router.refresh();
    } catch (error) {
      console.error("Failed to update project task workflow", error);
      toast.error("Unable to update task workflow.");
    } finally {
      setSavingWorkflow(false);
    }
  }

  async function saveTemplate() {
    setSavingTemplate(true);
    try {
      const result = await saveTaskStatusTemplateAction({
        projectId,
        name: templateName,
        statuses,
      });
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      const templatesResult = await getTaskStatusTemplatesAction(projectId);
      if (!templatesResult.success) {
        toast.error(templatesResult.message);
        return;
      }
      const nextTemplates = templatesResult.data ?? [];
      setTemplates(nextTemplates);
      setTemplateId(
        nextTemplates.find(({ name }) => name.toLowerCase() === templateName.trim().toLowerCase())?.id ?? "",
      );
      setTemplateName("");
      toast.success(result.message);
    } catch (error) {
      console.error("Failed to save task status template", error);
      toast.error("Unable to save task status template.");
    } finally {
      setSavingTemplate(false);
    }
  }

  return (
    <>
      <Button type="button" variant="outline" onClick={() => void openSettings()}>
        <Settings2 aria-hidden="true" />
        Task statuses
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Task workflow</DialogTitle>
            <DialogDescription>
              Choose a template or tailor this project’s statuses. Done counts as
              completed; Closed is terminal but does not count as completed.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <label className="grid gap-1.5 text-sm font-medium">
              Start with a template
              <OptionSelect
                label="Task status template"
                value={templateId}
                onValueChange={selectTemplate}
                emptyLabel="Custom workflow"
                disabled={loadingTemplates}
                options={templates.map((template) => ({
                  value: template.id,
                  label: `${template.name}${template.isSystem ? " · built-in" : ""}`,
                  icon: "planning",
                }))}
              />
            </label>

            {TASK_STATUS_GROUPS.map(({ id: group, label }) => {
              const groupStatuses = statuses.filter((status) => status.group === group);
              return (
                <section key={group} className="rounded-lg border">
                  <header className="flex items-center justify-between gap-3 border-b px-3 py-2.5">
                    <div>
                      <h3 className="font-medium">{label}</h3>
                      <p className="text-xs text-muted-foreground">
                        {group === "DONE"
                          ? "Tasks in this group count toward completion."
                          : group === "CLOSED"
                            ? "Closed tasks are excluded from open and overdue counts."
                            : "Tasks in this group remain open."}
                      </p>
                    </div>
                    <Button type="button" size="sm" variant="outline" onClick={() => addStatus(group)}>
                      <Plus aria-hidden="true" />
                      Add status
                    </Button>
                  </header>
                  <div className="divide-y">
                    {groupStatuses.map((status) => (
                      <div
                        key={status.id}
                        className="grid gap-2 p-3 sm:grid-cols-[minmax(0,1fr)_160px_52px_36px] sm:items-center"
                      >
                        <Input
                          aria-label={`Name for ${status.name}`}
                          value={status.name}
                          maxLength={60}
                          onChange={(event) => updateStatus(status.id, { name: event.target.value })}
                        />
                        <OptionSelect
                          label={`Group for ${status.name}`}
                          value={status.group}
                          onValueChange={(value) => {
                            const nextGroup = TASK_STATUS_GROUPS.find((item) => item.id === value)?.id;
                            if (nextGroup) updateStatus(status.id, { group: nextGroup });
                          }}
                          options={groupOptions}
                        />
                        <Input
                          aria-label={`Color for ${status.name}`}
                          type="color"
                          value={status.color}
                          onChange={(event) => updateStatus(status.id, { color: event.target.value })}
                          className="h-9 w-full cursor-pointer p-1"
                        />
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          aria-label={`Remove ${status.name}`}
                          disabled={groupStatuses.length <= 1}
                          onClick={() => {
                            setTemplateId("");
                            setStatuses((current) =>
                              current.filter((candidate) => candidate.id !== status.id),
                            );
                          }}
                        >
                          <Trash2 aria-hidden="true" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}

            {!workflowValidation.success && (
              <p role="alert" className="text-sm text-destructive">
                {workflowValidation.error.issues[0]?.message ?? "Review the workflow statuses."}
              </p>
            )}

            <div className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
              <label className="grid gap-1.5 text-sm font-medium">
                Save these statuses as a shared template
                <Input
                  value={templateName}
                  maxLength={60}
                  onChange={(event) => setTemplateName(event.target.value)}
                  placeholder="For example, Customer onboarding"
                />
              </label>
              <Button
                type="button"
                variant="outline"
                disabled={savingTemplate || !templateName.trim() || !workflowValidation.success}
                onClick={() => void saveTemplate()}
              >
                {savingTemplate ? "Saving…" : "Save template"}
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={savingWorkflow || !workflowValidation.success}
              onClick={() => void applyWorkflow()}
            >
              {savingWorkflow ? "Applying…" : "Apply changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
