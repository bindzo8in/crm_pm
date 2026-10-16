import { z } from "zod";

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

export const projectTaskStatusSchema = z.enum([
  "TODO",
  "IN_PROGRESS",
  "BLOCKED",
  "DONE",
  "CANCELLED",
]);

const optionalDate = z.union([z.iso.date(), z.literal("")]).optional().nullable();

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

export const projectStatusUpdateSchema = z.object({
  projectId: z.string().min(1),
  status: projectStatusSchema,
});

export const projectQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  status: projectStatusSchema.optional(),
  priority: projectPrioritySchema.optional(),
  customerId: z.string().optional(),
  projectManagerId: z.string().optional(),
  dueFrom: z.iso.date().optional(),
  dueTo: z.iso.date().optional(),
  cursor: z.coerce.number().int().positive().optional(),
  direction: z.enum(["next", "previous"]).default("next"),
  sortDirection: z.enum(["asc", "desc"]).default("desc"),
  pageSize: z.coerce.number().int().min(10).max(100).default(25),
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
  title: z.string().trim().min(1, "Task title is required").max(160),
  description: z.string().trim().max(3000).optional().nullable(),
  assigneeId: z.string().trim().optional().nullable(),
  dueDate: optionalDate,
  priority: projectPrioritySchema.default("MEDIUM"),
});

export const projectTaskUpdateSchema = z.object({
  taskId: z.string().min(1),
  status: projectTaskStatusSchema.optional(),
  title: z.string().trim().min(1).max(160).optional(),
  description: z.string().trim().max(3000).optional().nullable(),
  assigneeId: z.string().trim().optional().nullable(),
  dueDate: optionalDate,
  priority: projectPrioritySchema.optional(),
}).refine((input) => Object.keys(input).length > 1, "Choose at least one task field to update");

export type ProjectInput = z.infer<typeof projectInputSchema>;
export type ProjectUpdateInput = z.infer<typeof projectUpdateSchema>;
export type ProjectQuery = z.infer<typeof projectQuerySchema>;
export type ProjectTaskInput = z.infer<typeof projectTaskInputSchema>;
export type ProjectTaskUpdateInput = z.infer<typeof projectTaskUpdateSchema>;
