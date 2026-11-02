"use server";

import prisma from "@/lib/prisma";
import { getProposalPricing } from "@/actions/proposal-pricing";
import { z } from "zod";
import {
  clientProposalSignatureSchema,
  type ClientProposalSignature,
} from "@/lib/schemas/public-proposal-schema";

export async function getPublicProposalData(proposalId: string) {
  try {
    // We only fetch pricing data because it correctly formats all fields for rendering.
    // It also checks if the proposal exists.
    const pricingRes = await getProposalPricing(proposalId, true);
    if (!pricingRes.success || !pricingRes.data) {
      return {
        success: false,
        message: pricingRes.message.toLowerCase().includes("not found")
          ? "Proposal not found"
          : "Proposal could not be loaded",
      };
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
  signatureData: ClientProposalSignature,
  termsAccepted: boolean,
) {
  try {
    const validatedInput = z.object({
      proposalId: z.string().trim().min(1).max(100).regex(/^[A-Za-z0-9_-]+$/),
      signatureData: clientProposalSignatureSchema,
      termsAccepted: z.literal(true),
    }).safeParse({ proposalId, signatureData, termsAccepted });

    if (!validatedInput.success) {
      return { success: false, message: "A valid signature and agreement to the proposal terms are required" };
    }

    if (validatedInput.data.signatureData.method !== "TYPED") {
      const signature = validatedInput.data.signatureData;
      const signatureUrl = new URL(signature.url);
      const proposalFolder = `proposal-signatures/${validatedInput.data.proposalId}/`;
      if (
        signatureUrl.protocol !== "https:"
        || signatureUrl.hostname !== "res.cloudinary.com"
        || !signatureUrl.pathname.includes("/image/upload/")
        || !signatureUrl.pathname.includes(`/${proposalFolder}`)
        || !signature.publicId.startsWith(proposalFolder)
        || signature.publicId.includes("..")
        || signature.publicId.includes("\\")
      ) {
        return { success: false, message: "The uploaded signature is not valid for this proposal" };
      }
    }

    const proposal = await prisma.proposal.findUnique({
      where: { id: validatedInput.data.proposalId },
    });

    if (!proposal) {
      return { success: false, message: "Proposal not found" };
    }

    if (proposal.status === "ACCEPTED") {
      return { success: false, message: "Proposal is already accepted" };
    }

    if (proposal.status !== "SENT") {
      return { success: false, message: "Only sent proposals can be accepted" };
    }

    const updateResult = await prisma.proposal.updateMany({
      where: { id: validatedInput.data.proposalId, status: "SENT" },
      data: {
        status: "ACCEPTED",
        acceptedAt: new Date(),
        clientSignature: validatedInput.data.signatureData,
      },
    });

    if (updateResult.count === 0) {
      return { success: false, message: "Proposal can no longer be accepted" };
    }

    return { success: true, message: "Proposal accepted successfully" };
  } catch (error) {
    console.error("Error accepting public proposal:", error);
    return { success: false, message: "Failed to accept proposal" };
  }
}
