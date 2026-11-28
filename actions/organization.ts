"use server";

import { auth } from "@/lib/auth";
import { isPlatformSuperAdmin } from "@/lib/global-role";
import { organizationSlugSchema } from "@/lib/organization-slug";
import prisma from "@/lib/prisma";
import { findAvailableOrganizationSlug } from "@/repositories/organization-repository";
import { APIError } from "better-auth/api";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

const organizationIdSchema = z.string().trim().min(1).max(128);
const createOrganizationSchema = z.object({
  name: z.string().trim().min(1, "Enter an organization name.").max(100),
  slug: organizationSlugSchema,
});

export type CreateOrganizationState = {
  error?: string;
};

export type OrganizationSlugAvailability = {
  available: boolean;
  suggestedSlug?: string;
  error?: string;
};

export async function checkOrganizationSlugAvailability(
  slug: string,
): Promise<OrganizationSlugAvailability> {
  const parsedSlug = organizationSlugSchema.safeParse(slug);
  if (!parsedSlug.success) {
    return {
      available: false,
      error:
        parsedSlug.error.issues[0]?.message ??
        "Enter a valid workspace address.",
    };
  }

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return { available: false, error: "Unauthorized." };
  }
  if (!isPlatformSuperAdmin(session.user.role)) {
    return {
      available: false,
      error: "Only platform administrators can create organizations.",
    };
  }

  const suggestedSlug = await findAvailableOrganizationSlug(parsedSlug.data);
  return {
    available: suggestedSlug === parsedSlug.data,
    ...(suggestedSlug !== parsedSlug.data ? { suggestedSlug } : {}),
  };
}

export async function createOrganization(
  _previousState: CreateOrganizationState,
  formData: FormData,
): Promise<CreateOrganizationState> {
  const parsed = createOrganizationSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Enter valid organization details." };
  }

  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  if (!isPlatformSuperAdmin(session.user.role)) {
    return { error: "Only platform administrators can create organizations." };
  }

  try {
    const organization = await auth.api.createOrganization({
      headers: requestHeaders,
      body: {
        ...parsed.data,
        keepCurrentActiveOrganization: true,
      },
    });
    await prisma.$transaction(async (transaction) => {
      const teams = await transaction.team.findMany({
        where: { organizationId: organization.id },
        select: { id: true },
      });
      if (teams.length > 0) {
        await transaction.teamMember.deleteMany({
          where: {
            userId: session.user.id,
            teamId: { in: teams.map((team) => team.id) },
          },
        });
      }
      await transaction.member.deleteMany({
        where: {
          organizationId: organization.id,
          userId: session.user.id,
        },
      });
    });
    redirect(`/platform/organizations/${organization.id}`);
  } catch (error) {
    if (error instanceof APIError) {
      return { error: error.message };
    }
    throw error;
  }
}

export async function setActiveOrganization(formData: FormData) {
  const parsedOrganizationId = organizationIdSchema.safeParse(
    formData.get("organizationId"),
  );
  if (!parsedOrganizationId.success) {
    throw new Error("Choose a valid organization.");
  }

  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  if (isPlatformSuperAdmin(session.user.role)) {
    throw new Error("Platform administrators cannot switch into organization workspaces.");
  }

  const membership = await prisma.member.findUnique({
    where: {
      organizationId_userId: {
        organizationId: parsedOrganizationId.data,
        userId: session.user.id,
      },
    },
    select: { id: true },
  });
  if (!membership) {
    throw new Error("You are not a member of that organization.");
  }

  await auth.api.setActiveOrganization({
    headers: requestHeaders,
    body: { organizationId: parsedOrganizationId.data },
  });
  redirect("/dashboard");
}
