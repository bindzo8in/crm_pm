import { EmploymentStatus } from "@/app/generated/prisma/enums";
import prisma from "@/lib/prisma";

export interface OrganizationMemberOption {
  id: string;
  name: string;
  email: string;
}

export async function getOrganizationMemberOptions(
  organizationId: string,
): Promise<OrganizationMemberOption[]> {
  const members = await prisma.member.findMany({
    where: {
      organizationId,
      user: {
        banned: { not: true },
        employmentStatus: EmploymentStatus.ACTIVE,
      },
    },
    select: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return members
    .map(({ user }) => user)
    .sort((left, right) => left.name.localeCompare(right.name));
}

export async function isActiveOrganizationMember(
  organizationId: string,
  userId: string,
): Promise<boolean> {
  const member = await prisma.member.findFirst({
    where: {
      organizationId,
      userId,
      user: {
        banned: { not: true },
        employmentStatus: EmploymentStatus.ACTIVE,
      },
    },
    select: { id: true },
  });

  return Boolean(member);
}
