import assert from "node:assert/strict";
import test from "node:test";
import {
  isPendingOrganizationInvitationForEmail,
  isPendingOwnerInvitationForEmail,
} from "../lib/organization-invitation-validation";

const now = new Date("2026-11-13T12:00:00.000Z");
const invitation = {
  id: "invitation-1",
  email: "owner@example.com",
  role: "owner",
  status: "pending",
  expiresAt: new Date("2026-11-14T12:00:00.000Z"),
};

test("owner invitation validation requires the invited email and a pending owner role", () => {
  assert.equal(
    isPendingOwnerInvitationForEmail(
      invitation,
      invitation.id,
      "OWNER@example.com",
      now,
    ),
    true,
  );
  assert.equal(
    isPendingOwnerInvitationForEmail(
      invitation,
      invitation.id,
      "other@example.com",
      now,
    ),
    false,
  );
  assert.equal(
    isPendingOwnerInvitationForEmail(
      { ...invitation, role: "member" },
      invitation.id,
      invitation.email,
      now,
    ),
    false,
  );
});

test("owner invitation validation rejects expired or canceled invitations", () => {
  assert.equal(
    isPendingOwnerInvitationForEmail(
      { ...invitation, expiresAt: now },
      invitation.id,
      invitation.email,
      now,
    ),
    false,
  );
  assert.equal(
    isPendingOwnerInvitationForEmail(
      { ...invitation, status: "canceled" },
      invitation.id,
      invitation.email,
      now,
    ),
    false,
  );
});

test("organization invitations allow pending non-owner roles for the invited email", () => {
  const memberInvitation = { ...invitation, role: "member" };
  assert.equal(
    isPendingOrganizationInvitationForEmail(
      memberInvitation,
      memberInvitation.id,
      "OWNER@example.com",
      now,
    ),
    true,
  );
  assert.equal(
    isPendingOrganizationInvitationForEmail(
      memberInvitation,
      memberInvitation.id,
      "someone-else@example.com",
      now,
    ),
    false,
  );
  assert.equal(
    isPendingOrganizationInvitationForEmail(
      { ...memberInvitation, status: "canceled" },
      memberInvitation.id,
      memberInvitation.email,
      now,
    ),
    false,
  );
});
