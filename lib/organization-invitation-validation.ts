type OrganizationInvitationCandidate = {
  id: string;
  email: string;
  role: string;
  status: string;
  expiresAt: Date;
};

export function isPendingOrganizationInvitationForEmail(
  invitation: OrganizationInvitationCandidate,
  invitationId: string,
  email: string,
  now = new Date(),
): boolean {
  return (
    invitation.id === invitationId &&
    invitation.status === "pending" &&
    invitation.expiresAt > now &&
    invitation.email.trim().toLowerCase() === email.trim().toLowerCase()
  );
}

export function isPendingOwnerInvitationForEmail(
  invitation: OrganizationInvitationCandidate,
  invitationId: string,
  email: string,
  now = new Date(),
): boolean {
  return (
    invitation.role === "owner" &&
    isPendingOrganizationInvitationForEmail(invitation, invitationId, email, now)
  );
}
