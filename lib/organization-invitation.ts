import prisma from "@/lib/prisma";
import {
  isPendingOrganizationInvitationForEmail,
  isPendingOwnerInvitationForEmail,
} from "./organization-invitation-validation";

export const ORGANIZATION_INVITATION_SIGNUP_HEADER =
  "x-crm-organization-invitation-id";

export async function getPendingOwnerInvitation(
  invitationId: string | null,
  email: string,
) {
  const invitation = await getPendingOrganizationInvitationById(invitationId);
  return invitation &&
    isPendingOwnerInvitationForEmail(invitation, invitationId ?? "", email)
    ? invitation
    : null;
}

export async function getPendingOrganizationInvitation(
  invitationId: string | null,
  email: string,
) {
  const invitation = await getPendingOrganizationInvitationById(invitationId);
  return invitation &&
    isPendingOrganizationInvitationForEmail(invitation, invitationId ?? "", email)
    ? invitation
    : null;
}

export async function getPendingOwnerInvitationById(invitationId: string | null) {
  const invitation = await getPendingOrganizationInvitationById(invitationId);
  return invitation &&
    isPendingOwnerInvitationForEmail(invitation, invitationId ?? "", invitation.email)
    ? invitation
    : null;
}

export async function getPendingOrganizationInvitationById(
  invitationId: string | null,
) {
  if (!invitationId || invitationId.length > 128) {
    return null;
  }

  const invitation = await prisma.invitation.findUnique({
    where: { id: invitationId },
    select: {
      id: true,
      email: true,
      role: true,
      status: true,
      expiresAt: true,
      inviterId: true,
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  });

  return invitation &&
    isPendingOrganizationInvitationForEmail(
      invitation,
      invitationId,
      invitation.email,
    )
    ? invitation
    : null;
}
