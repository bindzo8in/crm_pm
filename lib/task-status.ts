import { z } from "zod";

export const DEFAULT_TASK_STATUS_TEMPLATE_ID = "task-status-template-default";

export const taskStatusGroupSchema = z.enum([
  "NOT_STARTED",
  "ACTIVE",
  "DONE",
  "CLOSED",
]);

export const taskWorkflowStatusSchema = z.object({
  id: z.string().regex(/^[A-Z0-9][A-Z0-9_-]{0,49}$/),
  name: z.string().trim().min(1).max(60),
  group: taskStatusGroupSchema,
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});

export const taskWorkflowStatusesSchema = z.array(taskWorkflowStatusSchema)
  .min(4)
  .max(30)
  .superRefine((statuses, context) => {
    const ids = new Set<string>();
    const groups = new Set<string>();
    for (const [index, status] of statuses.entries()) {
      if (ids.has(status.id)) {
        context.addIssue({
          code: "custom",
          message: "Status IDs must be unique.",
          path: [index, "id"],
        });
      }
      ids.add(status.id);
      groups.add(status.group);
    }
    for (const group of taskStatusGroupSchema.options) {
      if (!groups.has(group)) {
        context.addIssue({
          code: "custom",
          message: "Add at least one status to every status group.",
        });
      }
    }
  });

export type TaskStatusGroup = z.infer<typeof taskStatusGroupSchema>;
export type TaskWorkflowStatus = z.infer<typeof taskWorkflowStatusSchema>;

export const TASK_STATUS_GROUPS: readonly {
  id: TaskStatusGroup;
  label: string;
}[] = [
  { id: "NOT_STARTED", label: "Not started" },
  { id: "ACTIVE", label: "Active" },
  { id: "DONE", label: "Done" },
  { id: "CLOSED", label: "Closed" },
];

export const DEFAULT_TASK_WORKFLOW: TaskWorkflowStatus[] = [
  { id: "TODO", name: "To do", group: "NOT_STARTED", color: "#64748b" },
  { id: "IN_PROGRESS", name: "In progress", group: "ACTIVE", color: "#2563eb" },
  { id: "BLOCKED", name: "Blocked", group: "ACTIVE", color: "#d97706" },
  { id: "DONE", name: "Done", group: "DONE", color: "#16a34a" },
  { id: "CANCELLED", name: "Cancelled", group: "CLOSED", color: "#71717a" },
];

export function parseTaskWorkflowStatuses(value: unknown): TaskWorkflowStatus[] {
  const parsed = taskWorkflowStatusesSchema.safeParse(value);
  if (!parsed.success) {
    throw new Error("The project task workflow configuration is invalid.");
  }
  return parsed.data;
}

export function isTaskStatusTerminal(group: TaskStatusGroup) {
  return group === "DONE" || group === "CLOSED";
}
