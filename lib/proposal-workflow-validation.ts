import prisma from "@/lib/prisma";
import {
  proposalDetailsStepSchema,
  proposalDocumentStepSchema,
  proposalPricingStepSchema,
} from "@/lib/schemas/proposal-workflow-schema";

export async function getProposalWorkflowValidation(proposalId: string) {
  const proposal = await prisma.proposal.findUnique({
    where: { id: proposalId },
    select: {
      status: true,
      customerId: true,
      title: true,
      currency: true,
      validUntil: true,
      proposalServices: {
        select: {
          items: {
            select: { name: true, quantity: true, unitPrice: true },
          },
        },
      },
      proposalBlocks: {
        select: { type: true, sortOrder: true, isVisible: true },
      },
    },
  });

  if (!proposal) return null;

  const details = proposalDetailsStepSchema.safeParse({
    customerId: proposal.customerId,
    title: proposal.title,
    currency: proposal.currency,
    validUntil: proposal.validUntil,
  });
  const pricing = proposalPricingStepSchema.safeParse({
    services: proposal.proposalServices.map((service) => ({
      items: service.items.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice.toNumber(),
      })),
    })),
  });
  const document = proposalDocumentStepSchema.safeParse({
    blocks: proposal.proposalBlocks,
  });

  return {
    status: proposal.status,
    detailsValid: details.success,
    pricingValid: details.success && pricing.success,
    documentValid: details.success && pricing.success && document.success,
    pricingMessage: pricing.success
      ? null
      : pricing.error.issues[0]?.message ?? "Add pricing before continuing to the document.",
    documentMessage: document.success
      ? null
      : document.error.issues[0]?.message ?? "Complete the document before previewing.",
  };
}
