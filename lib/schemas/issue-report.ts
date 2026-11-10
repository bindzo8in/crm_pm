import { z } from "zod";
import { IssueReportStatus, IssueReportType } from "@/app/generated/prisma/enums";

export const issueReportTypeSchema = z.enum(IssueReportType);
export const issueReportStatusSchema = z.enum(IssueReportStatus);

export const createIssueReportSchema = z.object({
  type: issueReportTypeSchema,
  title: z.string().trim().min(5, "Add a short title (at least 5 characters).").max(160),
  description: z.string().trim().min(20, "Add a few details (at least 20 characters).").max(5000),
});

export const updateIssueReportSchema = z.object({
  id: z.string().trim().min(1).max(100),
  status: issueReportStatusSchema,
  response: z.string().trim().max(2000, "Response must be 2,000 characters or fewer."),
});

export type CreateIssueReportInput = z.infer<typeof createIssueReportSchema>;
export type UpdateIssueReportInput = z.infer<typeof updateIssueReportSchema>;
