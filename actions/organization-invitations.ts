"use server";

import { randomUUID } from "node:crypto";
import { auth } from "@/lib/auth";
import { GlobalRole, isPlatformSuperAdmin } from "@/lib/global-role";
import {
  getPendingOrganizationInvitationById,
  getPendingOrganizationInvitation,
  ORGANIZATION_INVITATION_SIGNUP_HEADER,
} from "@/lib/organization-invitation";
import prisma from "@/lib/prisma";
import { env } from "@/lib/env";
import { APIError } from "better-auth/api";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

const inviteOwnerSchema = z.object({
  organizationId: z.string().trim().min(1).max(128),
  email: z.string().trim().email().max(254).transform((email) => email.toLowerCase()),
});

const invitationIdSchema = z.string().trim().min(1).max(128);

const ownerSignupSchema = z
  .object({
    invitationId: invitationIdSchema,
    name: z.string().trim().min(1, "Enter your name.").max(100),
    password: z.string().min(8, "Use at least 8 characters.").max(128),
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export type OrganizationInvitationActionState = {
  error?: string;
  success?: string;
};

async function getPlatformAdminSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    throw new Error("Unauthorized.");
  }
  if (!isPlatformSuperAdmin(session.user.role)) {
    throw new Error("Only platform administrators can manage organizations.");
  }
  return session;
}

export async function inviteOrganizationOwner(
  _previousState: OrganizationInvitationActionState,
  formData: FormData,
): Promise<OrganizationInvitationActionState> {
  const parsed = inviteOwnerSchema.safeParse({
    organizationId: formData.get("organizationId"),
    email: formData.get("email"),
  });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Enter a valid email address.",
    };
  }

  const session = await getPlatformAdminSession();
  const { organizationId, email } = parsed.data;
  if (email === session.user.email.toLowerCase()) {
    return { error: "Invite a different account to own this organization." };
  }

  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { id: true },
  });
  if (!organization) {
    return { error: "Organization not found." };
  }

  const members = await prisma.member.findMany({
    where: { organizationId },
    select: {
      role: true,
      user: { select: { role: true } },
    },
  });
  if (
    members.some(
      (member) =>
        member.role.split(",").includes("owner") &&
        member.user.role !== GlobalRole.SUPER_ADMIN,
    )
  ) {
    return { error: "This organization already has an owner." };
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { role: true },
  });
  if (existingUser?.role === GlobalRole.SUPER_ADMIN) {
    return { error: "A platform administrator cannot be invited as an owner." };
  }

  const pendingOwnerInvitation = await prisma.invitation.findFirst({
    where: {
      organizationId,
      role: "owner",
      status: "pending",
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, email: true },
  });
  if (
    pendingOwnerInvitation &&
    pendingOwnerInvitation.email.toLowerCase() !== email
  ) {
    return {
      error: "Cancel the pending owner invitation before changing its email.",
    };
  }

  const requestHeaders = await headers();
  try {
    await prisma.member.upsert({
      where: {
        organizationId_userId: {
          organizationId,
          userId: session.user.id,
        },
      },
      create: {
        id: randomUUID(),
        organizationId,
        userId: session.user.id,
        role: "owner",
      },
      update: { role: "owner" },
    });

    await auth.api.createInvitation({
      headers: requestHeaders,
      body: {
        email,
        role: "owner",
        organizationId,
        resend: Boolean(pendingOwnerInvitation),
      },
    });
  } catch (error) {
    revalidatePath(`/platform/organizations/${organizationId}`);
    if (error instanceof APIError) {
      return { error: error.message };
    }
    console.error("Could not send organization owner invitation.", {
      organizationId,
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return {
      error: "The invitation could not be sent. Retry to send it again.",
    };
  }

  revalidatePath(`/platform/organizations/${organizationId}`);
  return {
    success: pendingOwnerInvitation
      ? `Invitation resent to ${email}.`
      : `Invitation sent to ${email}.`,
  };
}

export async function cancelOrganizationOwnerInvitation(
  _previousState: OrganizationInvitationActionState,
  formData: FormData,
): Promise<OrganizationInvitationActionState> {
  const parsedInvitationId = invitationIdSchema.safeParse(
    formData.get("invitationId"),
  );
  if (!parsedInvitationId.success) {
    return { error: "Choose a valid invitation." };
  }

  const session = await getPlatformAdminSession();
  const invitation = await prisma.invitation.findUnique({
    where: { id: parsedInvitationId.data },
    select: {
      id: true,
      organizationId: true,
      role: true,
      status: true,
    },
  });
  if (
    !invitation ||
    invitation.role !== "owner" ||
    invitation.status !== "pending"
  ) {
    return { error: "This owner invitation is no longer pending." };
  }

  const platformMembership = await prisma.member.findUnique({
    where: {
      organizationId_userId: {
        organizationId: invitation.organizationId,
        userId: session.user.id,
      },
    },
    select: { role: true },
  });
  if (!platformMembership?.role.split(",").includes("owner")) {
    return { error: "You cannot cancel this invitation." };
  }

  try {
    await auth.api.cancelInvitation({
      headers: await headers(),
      body: { invitationId: invitation.id },
    });
  } catch (error) {
    if (error instanceof APIError) {
      return { error: error.message };
    }
    throw error;
  }

  revalidatePath(`/platform/organizations/${invitation.organizationId}`);
  return { success: "Owner invitation canceled." };
}

export async function signUpInvitedMember(
  _previousState: OrganizationInvitationActionState,
  formData: FormData,
): Promise<OrganizationInvitationActionState> {
  const parsed = ownerSignupSchema.safeParse({
    invitationId: formData.get("invitationId"),
    name: formData.get("name"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Enter valid account details.",
    };
  }

  const invitation = await getPendingOrganizationInvitationById(
    parsed.data.invitationId,
  );
  if (!invitation) {
    return { error: "This organization invitation is invalid or has expired." };
  }

  const callbackUrl = new URL(
    "/accept-invitation",
    env.NEXT_PUBLIC_SITE_URL,
  );
  callbackUrl.searchParams.set("invitationId", invitation.id);
  const requestHeaders = new Headers(await headers());
  requestHeaders.set(
    ORGANIZATION_INVITATION_SIGNUP_HEADER,
    invitation.id,
  );

  try {
    await auth.api.signUpEmail({
      headers: requestHeaders,
      body: {
        name: parsed.data.name,
        email: invitation.email,
        password: parsed.data.password,
        callbackURL: callbackUrl.toString(),
      },
    });
  } catch (error) {
    if (error instanceof APIError) {
      return { error: error.message };
    }
    throw error;
  }

  return {
    success: `Check ${invitation.email} for a verification link to continue.`,
  };
}

export async function acceptOrganizationInvitation(
  _previousState: OrganizationInvitationActionState,
  formData: FormData,
): Promise<OrganizationInvitationActionState> {
  const parsedInvitationId = invitationIdSchema.safeParse(
    formData.get("invitationId"),
  );
  if (!parsedInvitationId.success) {
    return { error: "Choose a valid invitation." };
  }

  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session?.user) {
    return { error: "Sign in with the invited email address to accept." };
  }
  if (!session.user.emailVerified) {
    return {
      error: "Verify your email address before accepting this invitation.",
    };
  }

  const invitation = await getPendingOrganizationInvitation(
    parsedInvitationId.data,
    session.user.email,
  );
  if (!invitation) {
    return {
      error: "This invitation is invalid, expired, or belongs to another email.",
    };
  }

  try {
    await auth.api.acceptInvitation({
      headers: requestHeaders,
      body: { invitationId: invitation.id },
    });
  } catch (error) {
    if (error instanceof APIError) {
      return { error: error.message };
    }
    throw error;
  }

  redirect(invitation.role === "owner" ? "/onboarding" : "/dashboard/organizations");
}
