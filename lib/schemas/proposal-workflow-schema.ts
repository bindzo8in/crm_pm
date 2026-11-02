import { z } from "zod";

export const proposalDetailsStepSchema = z.object({
  customerId: z.string().min(1),
  title: z.string().trim(),
  currency: z.enum(["INR", "USD"]),
  validUntil: z.date().nullable(),
});

export const proposalPricingStepSchema = z.object({
  services: z.array(
    z.object({
      items: z.array(
        z.object({
          name: z.string().trim().min(1),
          quantity: z.number().int().min(1),
          unitPrice: z.number().finite().min(0),
        }),
      ),
    }),
  ).refine(
    (services) => services.some((service) => service.items.length > 0),
    "Add at least one priced item before continuing to the document.",
  ),
});

export const proposalDocumentStepSchema = z.object({
  blocks: z.array(
    z.object({
      type: z.string().min(1),
      sortOrder: z.number().int().min(0),
      isVisible: z.boolean(),
    }),
  ).refine(
    (blocks) => blocks.some((block) => block.isVisible),
    "Show at least one document section before previewing.",
  ),
});
