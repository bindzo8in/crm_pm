import type { ProposalWhereInput } from "@/app/generated/prisma/models";
import { auth } from "@/lib/auth";
import {
  checkOrganizationPermission,
  getActiveOrganizationId,
} from "@/lib/organization-authorization";
import prisma from "@/lib/prisma";
import { headers } from "next/headers";

type ProposalPermission =
  | "read"
  | "update"
  | "delete"
  | "send"
  | "accept";

type ProposalOwnPermission =
  | "read-own"
  | "update-own"
  | "delete-own"
  | "send-own"
  | "accept-own";

export async function getProposalPermissionScope(
  permission: ProposalPermission,
  ownPermission: ProposalOwnPermission,
  proposalId?: string,
): Promise<{ userId: string; where: ProposalWhereInput } | null> {
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session?.user) return null;
  const organizationId = await getActiveOrganizationId(requestHeaders);
  if (!organizationId) return null;

  const [allAccess, ownAccess] = await Promise.all([
    checkOrganizationPermission({
      headers: requestHeaders,
      body: { permissions: { proposals: [permission] } },
    }),
    checkOrganizationPermission({
      headers: requestHeaders,
      body: { permissions: { proposals: [ownPermission] } },
    }),
  ]);

  if (allAccess.success) {
    return {
      userId: session.user.id,
      where: {
        organizationId,
        ...(proposalId ? { id: proposalId } : {}),
      },
    };
  }
  if (!ownAccess.success) return null;

  const ownerFilter: ProposalWhereInput = {
    organizationId,
    OR: [
      { preparedById: session.user.id },
      { assignedToId: session.user.id },
    ],
  };
  if (proposalId) {
    const accessibleProposal = await prisma.proposal.findFirst({
      where: { id: proposalId, ...ownerFilter },
      select: { id: true },
    });
    if (!accessibleProposal) return null;
  }

  return {
    userId: session.user.id,
    where: proposalId ? { id: proposalId, ...ownerFilter } : ownerFilter,
  };
}
