import { z } from "zod";
import { taskWorkflowStatusesSchema } from "@/lib/task-status";

export const projectStatusSchema = z.enum([
  "PLANNING",
  "NOT_STARTED",
  "IN_PROGRESS",
  "ON_HOLD",
  "COMPLETED",
  "CANCELLED",
]);

export const projectPrioritySchema = z.enum([
  "LOW",
  "MEDIUM",
  "HIGH",
  "URGENT",
]);

const optionalDate = z.union([z.iso.date(), z.literal("")]).optional().nullable();

function queryArray<T extends z.ZodType>(schema: T, max = 10) {
  return z.preprocess(
    (value) => value === undefined ? undefined : Array.isArray(value) ? value : [value],
    z.array(schema).max(max).transform((values) => [...new Set(values)]).optional(),
  );
}

const projectInputObject = z.object({
  name: z.string().trim().min(1, "Project name is required").max(160),
  customerId: z.string().trim().optional().nullable(),
  proposalId: z.string().trim().optional().nullable(),
  description: z.string().trim().max(5000).optional().nullable(),
  objectives: z.string().trim().max(5000).optional().nullable(),
  scope: z.string().trim().max(15000).optional().nullable(),
  internalNotes: z.string().trim().max(5000).optional().nullable(),
  projectManagerId: z.string().trim().optional().nullable(),
  teamMemberIds: z.array(z.string().trim().min(1)).max(100).default([]),
  startDate: optionalDate,
  dueDate: optionalDate,
  priority: projectPrioritySchema.default("MEDIUM"),
  status: z.enum(["PLANNING", "NOT_STARTED"]).default("PLANNING"),
  budgetAmount: z.preprocess(
    (value) => value === "" || value === null ? undefined : value,
    z.coerce.number().finite().min(0).max(999999999999).optional(),
  ),
  currency: z.enum(["INR", "USD"]).default("INR"),
});

export const projectInputSchema = projectInputObject.superRefine((input, context) => {
  if (input.startDate && input.dueDate && input.dueDate < input.startDate) {
    context.addIssue({
      code: "custom",
      message: "Target date must be on or after the start date",
      path: ["dueDate"],
    });
  }
  if (input.projectManagerId && input.teamMemberIds.includes(input.projectManagerId)) {
    context.addIssue({
      code: "custom",
      message: "The project manager is already included as a team member",
      path: ["teamMemberIds"],
    });
  }
});

export const projectUpdateSchema = projectInputObject
  .omit({ proposalId: true, status: true })
  .partial()
  .extend({
    projectId: z.string().min(1),
  })
  .superRefine((input, context) => {
    if (input.startDate && input.dueDate && input.dueDate < input.startDate) {
      context.addIssue({
        code: "custom",
        message: "Target date must be on or after the start date",
        path: ["dueDate"],
      });
    }
    if (input.projectManagerId && input.teamMemberIds?.includes(input.projectManagerId)) {
      context.addIssue({
        code: "custom",
        message: "The project manager is already included as a team member",
        path: ["teamMemberIds"],
      });
    }
  });

export const projectTeamUpdateSchema = z.object({
  projectId: z.string().trim().min(1).max(100),
  projectManagerId: z.string().trim().min(1).max(100).nullable(),
  teamMemberIds: z.array(z.string().trim().min(1).max(100)).max(100),
}).superRefine(({ projectManagerId, teamMemberIds }, context) => {
  if (new Set(teamMemberIds).size !== teamMemberIds.length) {
    context.addIssue({
      code: "custom",
      message: "Team members must be unique.",
      path: ["teamMemberIds"],
    });
  }
  if (projectManagerId && teamMemberIds.includes(projectManagerId)) {
    context.addIssue({
      code: "custom",
      message: "The project manager cannot also be listed as a team member.",
      path: ["teamMemberIds"],
    });
  }
});

export const projectStatusUpdateSchema = z.object({
  projectId: z.string().min(1),
  status: projectStatusSchema,
});

export const projectQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  status: queryArray(projectStatusSchema, 6),
  priority: queryArray(projectPrioritySchema, 4),
  customerId: z.string().optional(),
  projectManagerId: queryArray(z.string().trim().min(1).max(100), 100),
  memberId: queryArray(z.string().trim().min(1).max(100), 100),
  overdue: z.enum(["true", "false"]).optional(),
  dueFrom: z.iso.date().optional(),
  dueTo: z.iso.date().optional(),
  cursor: z.coerce.number().int().positive().optional(),
  direction: z.enum(["next", "previous"]).default("next"),
  sortDirection: z.enum(["asc", "desc"]).default("desc"),
  view: z.enum(["grid", "list"]).default("grid"),
  pageSize: z.coerce.number().int().min(10).max(100).default(25),
});

export const projectTaskWorkspaceQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  view: z.enum(["all", "assigned", "created", "upcoming", "overdue", "completed"]).default("all"),
  status: queryArray(z.string().trim().regex(/^[A-Za-z0-9_-]{1,100}(?::[A-Z0-9_-]{1,50})?$/), 30),
  priority: queryArray(projectPrioritySchema, 4),
  cursor: z.string().trim().min(1).max(100).optional(),
  pageSize: z.coerce.number().int().min(10).max(100).default(30),
});

export const projectCreationContextSchema = z.object({
  customerId: z.string().trim().min(1).max(100).optional(),
  proposalId: z.string().trim().min(1).max(100).optional(),
});

export const projectUserQuerySchema = z.object({
  search: z.string().trim().max(120).default(""),
  page: z.coerce.number().int().min(0).max(10000).default(0),
});

export const projectTaskInputSchema = z.object({
  projectId: z.string().min(1),
  folderId: z.string().trim().min(1).max(100).optional().nullable(),
  parentTaskId: z.string().trim().min(1).max(100).optional().nullable(),
  title: z.string().trim().min(1, "Task title is required").max(160),
  description: z.string().trim().max(3000).optional().nullable(),
  assigneeId: z.string().trim().optional().nullable(),
  startDate: optionalDate,
  dueDate: optionalDate,
  status: z.string().trim().min(1).max(50).optional(),
  priority: projectPrioritySchema.default("MEDIUM"),
  timeEstimateMinutes: z.number().int().min(0).max(100000).optional().nullable(),
  sprintPoints: z.number().int().min(0).max(100).optional().nullable(),
}).superRefine((input, context) => {
  if (input.startDate && input.dueDate && input.dueDate < input.startDate) {
    context.addIssue({
      code: "custom",
      message: "Due date must be on or after the start date.",
      path: ["dueDate"],
    });
  }
});

export const projectTaskUpdateSchema = z.object({
  taskId: z.string().min(1),
  status: z.string().trim().min(1).max(50).optional(),
  folderId: z.string().trim().min(1).max(100).optional(),
  title: z.string().trim().min(1).max(160).optional(),
  description: z.string().trim().max(3000).optional().nullable(),
  assigneeId: z.string().trim().optional().nullable(),
  startDate: optionalDate,
  dueDate: optionalDate,
  priority: projectPrioritySchema.optional(),
  timeEstimateMinutes: z.number().int().min(0).max(100000).optional().nullable(),
  sprintPoints: z.number().int().min(0).max(100).optional().nullable(),
}).superRefine((input, context) => {
  if (Object.keys(input).length <= 1) {
    context.addIssue({
      code: "custom",
      message: "Choose at least one task field to update.",
    });
  }
  if (input.startDate && input.dueDate && input.dueDate < input.startDate) {
    context.addIssue({
      code: "custom",
      message: "Due date must be on or after the start date.",
      path: ["dueDate"],
    });
  }
});

export const projectTaskFolderCreateSchema = z.object({
  projectId: z.string().trim().min(1).max(100),
  name: z.string().trim().min(1).max(80),
  parentId: z.string().trim().min(1).max(100).nullable().optional(),
});

export const projectTaskFolderUpdateSchema = projectTaskFolderCreateSchema.extend({
  folderId: z.string().trim().min(1).max(100),
});

export const projectTaskFolderDeleteSchema = z.object({
  projectId: z.string().trim().min(1).max(100),
  folderId: z.string().trim().min(1).max(100),
});

export const projectTaskChecklistInputSchema = z.object({
  taskId: z.string().trim().min(1).max(100),
  title: z.string().trim().min(1).max(500),
});

export const projectTaskChecklistUpdateSchema = z.object({
  taskId: z.string().trim().min(1).max(100),
  itemId: z.string().trim().min(1).max(100),
  isComplete: z.boolean(),
});

export const projectTaskChecklistDeleteSchema = z.object({
  taskId: z.string().trim().min(1).max(100),
  itemId: z.string().trim().min(1).max(100),
});

export const projectTaskDependencyInputSchema = z.object({
  taskId: z.string().trim().min(1).max(100),
  dependsOnTaskId: z.string().trim().min(1).max(100),
  relationType: z.enum(["BLOCKED_BY", "RELATED_TO"]).default("BLOCKED_BY"),
});

export const projectTaskDependencyDeleteSchema = z.object({
  taskId: z.string().trim().min(1).max(100),
  dependencyId: z.string().trim().min(1).max(100),
});

export const projectTaskAttachmentInputSchema = z.object({
  taskId: z.string().trim().min(1).max(100),
  url: z.url().max(2000),
  publicId: z.string().trim().min(1).max(500),
  resourceType: z.enum(["image", "raw"]),
  fileName: z.string().trim().min(1).max(255),
  fileSize: z.number().int().positive().max(10 * 1024 * 1024),
});

export const projectTaskAttachmentDeleteSchema = z.object({
  taskId: z.string().trim().min(1).max(100),
  attachmentId: z.string().trim().min(1).max(100),
});

export const projectTaskCommentInputSchema = z.object({
  taskId: z.string().trim().min(1).max(100),
  content: z.string().trim().min(1).max(3000),
});

export const projectTaskTimerSchema = z.object({
  taskId: z.string().trim().min(1).max(100),
});

export const projectTaskIdSchema = z.object({
  taskId: z.string().trim().min(1).max(100),
});

export const projectTaskWorkflowUpdateSchema = z.object({
  projectId: z.string().trim().min(1).max(100),
  templateId: z.string().trim().min(1).max(100).nullable(),
  statuses: taskWorkflowStatusesSchema,
});

export const projectTaskStatusTemplateInputSchema = z.object({
  projectId: z.string().trim().min(1).max(100),
  name: z.string().trim().min(1).max(60),
  statuses: taskWorkflowStatusesSchema,
});

export type ProjectInput = z.infer<typeof projectInputSchema>;
export type ProjectUpdateInput = z.infer<typeof projectUpdateSchema>;
export type ProjectTeamUpdateInput = z.infer<typeof projectTeamUpdateSchema>;
export type ProjectQuery = z.infer<typeof projectQuerySchema>;
export type ProjectTaskWorkspaceQuery = z.infer<typeof projectTaskWorkspaceQuerySchema>;
export type ProjectTaskInput = z.infer<typeof projectTaskInputSchema>;
export type ProjectTaskUpdateInput = z.infer<typeof projectTaskUpdateSchema>;
export type ProjectTaskWorkflowUpdateInput = z.infer<typeof projectTaskWorkflowUpdateSchema>;
export type ProjectTaskStatusTemplateInput = z.infer<typeof projectTaskStatusTemplateInputSchema>;
