"use server";

import { errorResponse, successResponse } from "@/lib/action-response";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getErrorMessage } from "@/lib/schemas/prisma-utils";
import {
  createProposalBlockSchema,
  updateProposalBlockSchema,
  reorderProposalBlocksSchema,
  CreateProposalBlockInput,
  UpdateProposalBlockInput,
  ReorderProposalBlocksInput,
  ProposalBlockTypeEnum,
} from "@/lib/schemas/proposal-composer-schema";
import { getProposalPricing } from "@/actions/proposal-pricing";
import { headers } from "next/headers";
import { ProposalBlockType, Prisma } from "@/app/generated/prisma/client";

async function checkPermission(permission: "read" | "create" | "update" | "delete") {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user) {
    return { success: false, error: "You are not authenticated" };
  }

  const hasPermission = await auth.api.userHasPermission({
    headers: await headers(),
    body: {
      permissions: {
        proposals: [permission],
      },
    },
  });

  if (!hasPermission.success) {
    return { success: false, error: `You don't have permission to ${permission} proposal composer` };
  }

  return { success: true, session };
}

export async function getProposalComposerData(proposalId: string) {
  try {
    const perm = await checkPermission("read");
    if (!perm.success || !perm.session) return errorResponse(perm.error || "Unauthorized");

    // Fetch pricing data first (this also recalculates totals and validates proposal existence)
    const pricingRes = await getProposalPricing(proposalId);
    if (!pricingRes.success || !pricingRes.data) {
      return errorResponse(pricingRes.message || "Failed to fetch proposal pricing data");
    }

    // Check existing proposal blocks
    let blocks = await prisma.proposalBlock.findMany({
      where: { proposalId },
      orderBy: { sortOrder: "asc" },
    });

    // If no blocks exist, initialize default 6 system blocks inside a transaction
    if (blocks.length === 0) {
      const defaultBlocks = [
        {
          proposalId,
          type: "COVER" as const,
          sortOrder: 0,
          title: "Cover Page",
          isLocked: true,
          isSystemGenerated: true,
          content: {
            subtitle: "Commercial & Technical Proposal",
            preparedFor: pricingRes.data.customerDisplayName || pricingRes.data.customer?.displayName || "Client",
            preparedBy: perm.session.user.name || "Sales Executive",
            date: new Date().toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" }),
            layoutStyle: "MODERN",
          },
        },
        {
          proposalId,
          type: "PRICING" as const,
          sortOrder: 1,
          title: "Pricing & Financial Summary",
          isLocked: true,
          isSystemGenerated: true,
          content: {},
        },
        {
          proposalId,
          type: "FEATURES" as const,
          sortOrder: 2,
          title: "Key Features & Capabilities",
          isLocked: true,
          isSystemGenerated: true,
          content: {
            type: "doc",
            content: [
              {
                type: "heading",
                attrs: { level: 2 },
                content: [{ type: "text", text: "Project Scope & Core Deliverables" }],
              },
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: "Our solution is architected to provide industry-leading performance, security, and scalability tailored specifically to your organizational requirements.",
                  },
                ],
              },
            ],
          },
        },
        {
          proposalId,
          type: "TERMS" as const,
          sortOrder: 4,
          title: "Terms & Conditions",
          isLocked: true,
          isSystemGenerated: true,
          content: {
            type: "doc",
            content: [
              {
                type: "heading",
                attrs: { level: 2 },
                content: [{ type: "text", text: "Commercial & Legal Terms" }],
              },
              {
                type: "bulletList",
                content: [
                  {
                    type: "listItem",
                    content: [
                      {
                        type: "paragraph",
                        content: [{ type: "text", text: "Validity: This proposal is valid as per the timeframe specified in the commercial summary." }],
                      },
                    ],
                  },
                  {
                    type: "listItem",
                    content: [
                      {
                        type: "paragraph",
                        content: [{ type: "text", text: "Payment Terms: Invoices are payable within 15 days of issuance unless otherwise stated." }],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        },
        {
          proposalId,
          type: "TIMELINE" as const,
          sortOrder: 3,
          title: "Project Timeline & Milestones",
          isLocked: false,
          isSystemGenerated: true,
          content: {
            milestones: [
              {
                id: "m-1",
                title: "Project Kickoff & Requirement Analysis",
                duration: "1 Week",
                deliverable: "Project Plan & Technical Architecture Blueprint",
              },
              {
                id: "m-2",
                title: "Core Development & System Integration",
                duration: "3 Weeks",
                deliverable: "Working Beta Build & API Integration",
              },
              {
                id: "m-3",
                title: "Testing, UAT & Final Deployment",
                duration: "1 Week",
                deliverable: "Production Sign-off & Handover",
              },
            ],
          },
        },
        {
          proposalId,
          type: "SIGNATURE" as const,
          sortOrder: 5,
          title: "Acceptance & Sign-off",
          isLocked: true,
          isSystemGenerated: true,
          content: {
            clientSignatory: "Authorized Signatory",
            clientDesignation: "Client Representative",
            companySignatory: perm.session.user.name || "Account Executive",
            companyDesignation: "Company Representative",
          },
        },
      ];

      await prisma.$transaction(async (tx) => {
        for (const b of defaultBlocks) {
          await tx.proposalBlock.create({
            data: {
              proposalId: b.proposalId,
              type: b.type as ProposalBlockType,
              sortOrder: b.sortOrder,
              title: b.title,
              isLocked: b.isLocked,
              isSystemGenerated: b.isSystemGenerated,
              content: b.content,
            },
          });
        }
      });

      blocks = await prisma.proposalBlock.findMany({
        where: { proposalId },
        orderBy: { sortOrder: "asc" },
      });
    }

    // =========================================================================
    // Dynamic Sync: Fetch appropriate Terms & Conditions and structured Features
    // and merge if duplicate found by id into existing FEATURES & TERMS blocks
    // =========================================================================
    const proposalServices = await prisma.proposalService.findMany({
      where: { proposalId },
      select: {
        id: true,
        serviceId: true,
        packageId: true,
        serviceName: true,
        packageName: true,
      },
    });
    const serviceIds = proposalServices.map((s) => s.serviceId).filter((id): id is string => Boolean(id));
    const packageIds = proposalServices.map((s) => s.packageId).filter((id): id is string => Boolean(id));

    // 1. Fetch appropriate Terms & Conditions
    const applicableTerms = await prisma.proposalTerm.findMany({
      where: {
        isActive: true,
        OR: [
          { isDefault: true },
          { packages: { some: { packageId: { in: packageIds } } } },
        ],
      },
      orderBy: { createdAt: "asc" },
    });

    // Merge duplicate terms by ID
    const termsMap = new Map<string, typeof applicableTerms[0]>();
    for (const term of applicableTerms) {
      if (!termsMap.has(term.id)) {
        termsMap.set(term.id, term);
      }
    }
    const mergedTerms = Array.from(termsMap.values());

    // 2. Fetch structured Features
    const packageFeatures = await prisma.packageFeature.findMany({
      where: { packageId: { in: packageIds } },
      orderBy: { sortOrder: "asc" },
    });
    const proposalFeatures = await prisma.proposalFeature.findMany({
      where: { proposalService: { proposalId } },
      orderBy: { sortOrder: "asc" },
    });

    // Group and merge duplicate features by service package title and ID
    const featureGroupsMap = new Map<string, { content: string, isHeading: boolean }[]>();
    const processedFeatureIds = new Set<string>();

    for (const ps of proposalServices) {
      const title = ps.packageName || ps.serviceName || "Service Package";
      if (!featureGroupsMap.has(title)) {
        featureGroupsMap.set(title, []);
      }
      const groupList = featureGroupsMap.get(title)!;

      if (ps.packageId) {
        const pFeats = packageFeatures.filter((pf) => pf.packageId === ps.packageId);
        for (const pf of pFeats) {
          if (!processedFeatureIds.has(pf.id)) {
            processedFeatureIds.add(pf.id);
            groupList.push({ content: pf.content, isHeading: pf.isHeading });
          }
        }
      }

      const prFeats = proposalFeatures.filter((prf) => prf.proposalServiceId === ps.id || (ps.packageId && prf.packageId === ps.packageId));
      for (const prf of prFeats) {
        if (!processedFeatureIds.has(prf.id)) {
          processedFeatureIds.add(prf.id);
          groupList.push({ content: prf.content, isHeading: prf.isHeading });
        }
      }
    }

    // In case there are any leftover features that didn't match a specific proposal service
    const leftoverFeatures: { content: string, isHeading: boolean }[] = [];
    for (const pf of packageFeatures) {
      if (!processedFeatureIds.has(pf.id)) {
        processedFeatureIds.add(pf.id);
        leftoverFeatures.push({ content: pf.content, isHeading: pf.isHeading });
      }
    }
    for (const prf of proposalFeatures) {
      if (!processedFeatureIds.has(prf.id)) {
        processedFeatureIds.add(prf.id);
        leftoverFeatures.push({ content: prf.content, isHeading: prf.isHeading });
      }
    }
    if (leftoverFeatures.length > 0) {
      const defaultTitle = "Additional Features & Capabilities";
      if (!featureGroupsMap.has(defaultTitle)) {
        featureGroupsMap.set(defaultTitle, []);
      }
      const groupList = featureGroupsMap.get(defaultTitle)!;
      for (const feat of leftoverFeatures) {
        groupList.push(feat);
      }
    }

    const featureGroups = Array.from(featureGroupsMap.entries())
      .map(([title, features]) => ({ title, features }))
      .filter((g) => g.features.length > 0);

    const totalMergedFeaturesCount = featureGroups.reduce((acc, g) => acc + g.features.length, 0);

    // 3. Update FEATURES block if needed
    const featuresBlock = blocks.find((b) => b.type === "FEATURES");
    if (featuresBlock && totalMergedFeaturesCount > 0) {
      const contentStr = JSON.stringify(featuresBlock.content || {});
      const isDefaultPlaceholder = contentStr.includes("Our solution is architected");

      let needsUpdate = false;
      let newNodes: Array<Record<string, unknown>> = [];

      if (isDefaultPlaceholder) {
        needsUpdate = true;
        newNodes = [
          {
            type: "heading",
            attrs: { level: 2 },
            content: [{ type: "text", text: "Project Scope & Core Deliverables" }],
          },
        ];

        for (const group of featureGroups) {
          newNodes.push({
            type: "heading",
            attrs: { level: 3 },
            content: [{ type: "text", text: group.title }],
          });
          
          let currentList: any[] = [];
          for (const feature of group.features) {
            if (feature.isHeading) {
              if (currentList.length > 0) {
                newNodes.push({
                  type: "bulletList",
                  content: currentList
                });
                currentList = [];
              }
              newNodes.push({
                type: "heading",
                attrs: { level: 4 },
                content: [{ type: "text", text: feature.content }],
              });
            } else {
              currentList.push({
                type: "listItem",
                content: [{ type: "paragraph", content: [{ type: "text", text: feature.content }] }],
              });
            }
          }
          if (currentList.length > 0) {
            newNodes.push({
              type: "bulletList",
              content: currentList
            });
          }
        }
      } else {
        for (const group of featureGroups) {
          const missingInGroup = group.features.filter((f) => !contentStr.toLowerCase().includes(f.content.toLowerCase()));
          if (missingInGroup.length > 0) {
            needsUpdate = true;
            if (newNodes.length === 0) {
              const existingDoc = (featuresBlock.content as Record<string, unknown>) || { type: "doc", content: [] };
              newNodes = Array.isArray(existingDoc.content) ? [...(existingDoc.content as Array<Record<string, unknown>>)] : [];
            }

            if (!contentStr.toLowerCase().includes(group.title.toLowerCase())) {
              newNodes.push({
                type: "heading",
                attrs: { level: 3 },
                content: [{ type: "text", text: group.title }],
              });
            }
            
            let currentList: any[] = [];
            for (const feature of missingInGroup) {
              if (feature.isHeading) {
                if (currentList.length > 0) {
                  newNodes.push({
                    type: "bulletList",
                    content: currentList
                  });
                  currentList = [];
                }
                newNodes.push({
                  type: "heading",
                  attrs: { level: 4 },
                  content: [{ type: "text", text: feature.content }],
                });
              } else {
                currentList.push({
                  type: "listItem",
                  content: [{ type: "paragraph", content: [{ type: "text", text: feature.content }] }],
                });
              }
            }
            if (currentList.length > 0) {
              newNodes.push({
                type: "bulletList",
                content: currentList
              });
            }
          }
        }
      }

      if (needsUpdate) {
        const updatedContent = { type: "doc", content: newNodes } as Prisma.JsonObject;
        await prisma.proposalBlock.update({
          where: { id: featuresBlock.id },
          data: { content: updatedContent },
        });
        featuresBlock.content = updatedContent;
      }
    }

    // 4. Update TERMS block if needed
    const termsBlock = blocks.find((b) => b.type === "TERMS");
    if (termsBlock && mergedTerms.length > 0) {
      const contentStr = JSON.stringify(termsBlock.content || {});
      const isDefaultPlaceholder = contentStr.includes("Validity: This proposal is valid as per the timeframe specified");

      let needsUpdate = false;
      let newNodes: Array<Record<string, unknown>> = [];

      if (isDefaultPlaceholder) {
        needsUpdate = true;
        newNodes = [
          {
            type: "heading",
            attrs: { level: 2 },
            content: [{ type: "text", text: "Commercial & Legal Terms" }],
          },
        ];

        for (const term of mergedTerms) {
          newNodes.push({
            type: "heading",
            attrs: { level: 3 },
            content: [{ type: "text", text: term.title }],
          });
          if (term.content && typeof term.content === "object" && (term.content as Record<string, unknown>).type === "doc" && Array.isArray((term.content as Record<string, unknown>).content)) {
            newNodes.push(...((term.content as Record<string, unknown>).content as Array<Record<string, unknown>>));
          } else if (typeof term.content === "string") {
            newNodes.push({
              type: "paragraph",
              content: [{ type: "text", text: term.content }],
            });
          }
        }
      } else {
        const missingTerms = mergedTerms.filter((term) => !contentStr.toLowerCase().includes(term.title.toLowerCase()));
        if (missingTerms.length > 0) {
          needsUpdate = true;
          const existingDoc = (termsBlock.content as Record<string, unknown>) || { type: "doc", content: [] };
          newNodes = Array.isArray(existingDoc.content) ? [...(existingDoc.content as Array<Record<string, unknown>>)] : [];

          for (const term of missingTerms) {
            newNodes.push({
              type: "heading",
              attrs: { level: 3 },
              content: [{ type: "text", text: term.title }],
            });
            if (term.content && typeof term.content === "object" && (term.content as Record<string, unknown>).type === "doc" && Array.isArray((term.content as Record<string, unknown>).content)) {
              newNodes.push(...((term.content as Record<string, unknown>).content as Array<Record<string, unknown>>));
            } else if (typeof term.content === "string") {
              newNodes.push({
                type: "paragraph",
                content: [{ type: "text", text: term.content }],
              });
            }
          }
        }
      }

      if (needsUpdate) {
        const updatedContent = { type: "doc", content: newNodes } as Prisma.JsonObject;
        await prisma.proposalBlock.update({
          where: { id: termsBlock.id },
          data: { content: updatedContent },
        });
        termsBlock.content = updatedContent;
      }
    }

    return successResponse("Fetched proposal composer data", {
      proposal: pricingRes.data,
      blocks,
    });
  } catch (error) {
    if (process.env.NODE_ENV === "development") console.error(error);
    return errorResponse("Failed to fetch proposal composer data", getErrorMessage(error));
  }
}

export async function syncProposalComposerTermsAndFeatures(proposalId: string) {
  try {
    const perm = await checkPermission("update");
    if (!perm.success) return errorResponse(perm.error!);

    const res = await getProposalComposerData(proposalId);
    if (!res.success) return errorResponse(res.message || "Failed to sync");

    return successResponse("Successfully synced terms and features from services/packages", res.data);
  } catch (error) {
    return errorResponse("Failed to sync terms and features", getErrorMessage(error));
  }
}

export async function createProposalBlock(input: CreateProposalBlockInput) {
  try {
    const perm = await checkPermission("update");
    if (!perm.success) return errorResponse(perm.error!);

    const validated = createProposalBlockSchema.parse(input);

    // Protect against creating system blocks via manual insertion
    const systemTypes: ProposalBlockTypeEnum[] = ["COVER", "PRICING", "FEATURES", "TERMS", "SIGNATURE"];
    if (systemTypes.includes(validated.type)) {
      return errorResponse(`Cannot add duplicate system block of type ${validated.type}`);
    }

    // If TIMELINE, ensure only one exists
    if (validated.type === "TIMELINE") {
      const existingTimeline = await prisma.proposalBlock.findFirst({
        where: { proposalId: validated.proposalId, type: "TIMELINE" as ProposalBlockType },
      });
      if (existingTimeline) {
        return errorResponse("A Timeline block already exists in this proposal. Only one is allowed.");
      }
    }

    let sortOrder = validated.sortOrder;
    if (sortOrder === undefined) {
      const maxBlock = await prisma.proposalBlock.findFirst({
        where: { proposalId: validated.proposalId },
        orderBy: { sortOrder: "desc" },
      });
      sortOrder = maxBlock ? maxBlock.sortOrder + 1 : 0;
    }

    let defaultTitle = validated.title;
    let defaultContent = validated.content || {};

    if (validated.type === "PAGE_BREAK") {
      defaultTitle = "Page Break";
      defaultContent = { divider: true };
    } else if (validated.type === "TIMELINE") {
      defaultTitle = "Project Timeline & Milestones";
      defaultContent = {
        milestones: [
          {
            id: `m-${Date.now()}`,
            title: "Phase 1: Kickoff",
            duration: "1 Week",
            deliverable: "Initial Scope",
          },
        ],
      };
    } else if (validated.type === "CUSTOM" && !defaultContent.type) {
      defaultContent = {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "Enter your custom text here..." }],
          },
        ],
      };
    }

    const newBlock = await prisma.proposalBlock.create({
      data: {
        proposalId: validated.proposalId,
        type: validated.type as ProposalBlockType,
        title: defaultTitle,
        sortOrder,
        isVisible: true,
        isLocked: false,
        isSystemGenerated: validated.type === "TIMELINE",
        content: defaultContent,
      },
    });

    return successResponse("Block created successfully", newBlock);
  } catch (error) {
    if (process.env.NODE_ENV === "development") console.error(error);
    return errorResponse("Failed to create proposal block", getErrorMessage(error));
  }
}

export async function updateProposalBlock(id: string, proposalId: string, input: UpdateProposalBlockInput) {
  try {
    const perm = await checkPermission("update");
    if (!perm.success) return errorResponse(perm.error!);

    const validated = updateProposalBlockSchema.parse(input);

    const existing = await prisma.proposalBlock.findFirst({
      where: { id, proposalId },
    });
    if (!existing) {
      return errorResponse("Block not found");
    }

    // Protect Pricing block from being edited
    if (existing.type === ("PRICING" as ProposalBlockType) && (validated.content || validated.title !== undefined)) {
      return errorResponse("The Pricing Table block cannot be modified in the composer. Please edit pricing in the Pricing Engine.");
    }

    const updated = await prisma.proposalBlock.update({
      where: { id },
      data: {
        ...(validated.title !== undefined && { title: validated.title }),
        ...(validated.content !== undefined && { content: validated.content }),
        ...(validated.isVisible !== undefined && { isVisible: validated.isVisible }),
      },
    });

    return successResponse("Block updated successfully", updated);
  } catch (error) {
    if (process.env.NODE_ENV === "development") console.error(error);
    return errorResponse("Failed to update block", getErrorMessage(error));
  }
}

export async function reorderProposalBlocks(input: ReorderProposalBlocksInput) {
  try {
    const perm = await checkPermission("update");
    if (!perm.success) return errorResponse(perm.error!);

    const validated = reorderProposalBlocksSchema.parse(input);

    await prisma.$transaction(
      validated.items.map((item) =>
        prisma.proposalBlock.updateMany({
          where: { id: item.id, proposalId: validated.proposalId },
          data: { sortOrder: item.sortOrder },
        })
      )
    );

    return successResponse("Blocks reordered successfully");
  } catch (error) {
    if (process.env.NODE_ENV === "development") console.error(error);
    return errorResponse("Failed to reorder blocks", getErrorMessage(error));
  }
}

export async function duplicateProposalBlock(id: string, proposalId: string) {
  try {
    const perm = await checkPermission("update");
    if (!perm.success) return errorResponse(perm.error!);

    const existing = await prisma.proposalBlock.findFirst({
      where: { id, proposalId },
    });

    if (!existing) {
      return errorResponse("Block not found");
    }

    if (existing.isSystemGenerated || existing.type !== ("CUSTOM" as ProposalBlockType)) {
      return errorResponse("Only custom blocks can be duplicated. System blocks are unique.");
    }

    // Shift all subsequent blocks down by 1 inside a transaction
    const duplicate = await prisma.$transaction(async (tx) => {
      await tx.proposalBlock.updateMany({
        where: {
          proposalId,
          sortOrder: { gt: existing.sortOrder },
        },
        data: {
          sortOrder: { increment: 1 },
        },
      });

      return tx.proposalBlock.create({
        data: {
          proposalId,
          type: existing.type,
          title: `${existing.title || "Custom Block"} (Copy)`,
          sortOrder: existing.sortOrder + 1,
          isVisible: existing.isVisible,
          isLocked: false,
          isSystemGenerated: false,
          content: existing.content || {},
        },
      });
    });

    return successResponse("Block duplicated successfully", duplicate);
  } catch (error) {
    if (process.env.NODE_ENV === "development") console.error(error);
    return errorResponse("Failed to duplicate block", getErrorMessage(error));
  }
}

export async function deleteProposalBlock(id: string, proposalId: string) {
  try {
    const perm = await checkPermission("update");
    if (!perm.success) return errorResponse(perm.error!);

    const existing = await prisma.proposalBlock.findFirst({
      where: { id, proposalId },
    });

    if (!existing) {
      return errorResponse("Block not found");
    }

    const protectedTypes: string[] = ["COVER", "PRICING", "FEATURES", "TERMS", "SIGNATURE"];
    if (existing.isLocked || protectedTypes.includes(existing.type as string)) {
      return errorResponse(`The ${existing.type} system block cannot be deleted.`);
    }

    await prisma.proposalBlock.delete({
      where: { id },
    });

    return successResponse("Block deleted successfully");
  } catch (error) {
    if (process.env.NODE_ENV === "development") console.error(error);
    return errorResponse("Failed to delete block", getErrorMessage(error));
  }
}

export async function toggleBlockVisibility(id: string, proposalId: string, isVisible: boolean) {
  try {
    const perm = await checkPermission("update");
    if (!perm.success) return errorResponse(perm.error!);

    const updated = await prisma.proposalBlock.updateMany({
      where: { id, proposalId },
      data: { isVisible },
    });

    if (updated.count === 0) {
      return errorResponse("Block not found");
    }

    return successResponse(`Block is now ${isVisible ? "visible" : "hidden"}`);
  } catch (error) {
    if (process.env.NODE_ENV === "development") console.error(error);
    return errorResponse("Failed to toggle visibility", getErrorMessage(error));
  }
}
