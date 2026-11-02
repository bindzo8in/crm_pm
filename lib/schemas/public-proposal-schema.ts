import { z } from "zod";

export const clientProposalSignatureSchema = z.discriminatedUnion("method", [
  z.object({
    method: z.enum(["IMAGE", "DRAWN"]),
    url: z.string().url().max(2048),
    publicId: z.string().trim().min(1).max(500),
  }).strict(),
  z.object({
    method: z.literal("TYPED"),
    name: z.string().trim().min(2, "Enter your full name").max(120),
  }).strict(),
]);

export type ClientProposalSignature = z.infer<typeof clientProposalSignatureSchema>;
