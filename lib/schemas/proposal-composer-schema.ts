import { z } from "zod";

export const ProposalBlockTypeSchema = z.enum([
  "COVER",
  "PRICING",
  "FEATURES",
  "TERMS",
  "TIMELINE",
  "SIGNATURE",
  "CUSTOM",
  "PAGE_BREAK",
  "SECTION",
  "SERVICE",
  "PRICING_SUMMARY",
]);

export type ProposalBlockTypeEnum = z.infer<typeof ProposalBlockTypeSchema>;

export const createProposalBlockSchema = z
  .object({
    proposalId: z.string().min(1, "Proposal ID is required"),
    type: ProposalBlockTypeSchema,
    title: z.string().optional(),
    sortOrder: z.number().int().optional(),
    content: z.any().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === "CUSTOM" && (!data.title || data.title.trim().length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Title is required for custom blocks",
        path: ["title"],
      });
    }
  });

export type CreateProposalBlockInput = z.infer<typeof createProposalBlockSchema>;

export const updateProposalBlockSchema = z.object({
  title: z.string().optional(),
  content: z.any().optional(),
  isVisible: z.boolean().optional(),
});

export type UpdateProposalBlockInput = z.infer<typeof updateProposalBlockSchema>;

export const reorderProposalBlocksSchema = z.object({
  proposalId: z.string().min(1, "Proposal ID is required"),
  items: z.array(
    z.object({
      id: z.string().min(1, "Block ID is required"),
      sortOrder: z.number().int(),
    })
  ),
});

export type ReorderProposalBlocksInput = z.infer<typeof reorderProposalBlocksSchema>;

// --- Structured Block Content Schemas ---

export const coverBlockContentSchema = z.object({
  subtitle: z.string().optional().default("Commercial & Technical Proposal"),
  preparedFor: z.string().optional().default(""),
  preparedBy: z.string().optional().default(""),
  date: z.string().optional().default(""),
  layoutStyle: z.enum(["MODERN", "CLASSIC", "MINIMAL"]).default("MODERN"),
});

export type CoverBlockContent = z.infer<typeof coverBlockContentSchema>;

export const timelineMilestoneSchema = z.object({
  id: z.string(),
  title: z.string().min(1, "Milestone title is required"),
  duration: z.string().min(1, "Duration is required"),
  deliverable: z.string().optional().default(""),
});

export type TimelineMilestone = z.infer<typeof timelineMilestoneSchema>;

export const timelineBlockContentSchema = z.object({
  milestones: z.array(timelineMilestoneSchema).default([]),
});

export type TimelineBlockContent = z.infer<typeof timelineBlockContentSchema>;

export const signatureBlockContentSchema = z.object({
  clientSignatory: z.string().optional().default("Authorized Signatory"),
  clientDesignation: z.string().optional().default("Client Representative"),
  companySignatory: z.string().optional().default("Account Executive"),
  companyDesignation: z.string().optional().default("Company Representative"),
});

export type SignatureBlockContent = z.infer<typeof signatureBlockContentSchema>;
