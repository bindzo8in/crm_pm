import prisma from "@/lib/prisma";

export async function getProposalDraftError(proposalId: string): Promise<string | null> {
  const proposal = await prisma.proposal.findUnique({
    where: { id: proposalId },
    select: { status: true },
  });

  if (!proposal) return "Proposal not found";
  if (proposal.status !== "DRAFT") {
    return "Only draft proposals can be edited. Duplicate the proposal to make changes.";
  }

  return null;
}
