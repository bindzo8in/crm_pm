"use server";

import prisma from "@/lib/prisma";
import { getProposalPricing } from "@/actions/proposal-pricing";

export async function getPublicProposalData(proposalId: string) {
  try {
    // We only fetch pricing data because it correctly formats all fields for rendering.
    // It also checks if the proposal exists.
    const pricingRes = await getProposalPricing(proposalId, true);
    if (!pricingRes.success || !pricingRes.data) {
      return { success: false, message: "Proposal not found" };
    }

    const proposal = pricingRes.data;

    // Fetch the proposal blocks for rendering
    const blocks = await prisma.proposalBlock.findMany({
      where: { proposalId, isVisible: true }, // Only fetch visible blocks for public view
      orderBy: { sortOrder: "asc" },
    });

    return { 
      success: true, 
      data: { 
        proposal, 
        blocks 
      } 
    };
  } catch (error) {
    console.error("Error fetching public proposal:", error);
    return { success: false, message: "Failed to load proposal" };
  }
}

export async function publicAcceptProposal(
  proposalId: string,
  signatureData?: { url: string; publicId: string }
) {
  try {
    const proposal = await prisma.proposal.findUnique({
      where: { id: proposalId },
    });

    if (!proposal) {
      return { success: false, message: "Proposal not found" };
    }

    if (proposal.status === "ACCEPTED") {
      return { success: false, message: "Proposal is already accepted" };
    }

    if (!signatureData || !signatureData.url) {
      return { success: false, message: "Signature is required to accept this proposal" };
    }

    await prisma.proposal.update({
      where: { id: proposalId },
      data: {
        status: "ACCEPTED",
        acceptedAt: new Date(),
        clientSignature: signatureData as any,
      },
    });

    return { success: true, message: "Proposal accepted successfully" };
  } catch (error) {
    console.error("Error accepting public proposal:", error);
    return { success: false, message: "Failed to accept proposal" };
  }
}
