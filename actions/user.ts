"use server";

import { UserRole } from "@/app/generated/prisma/enums";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { headers } from "next/headers";

export async function getUsers({
  page,
  pageSize,
  search,
}: {
  page: number;
  pageSize: number;
  search?: string;
}) {
  return auth.api.listUsers({
    headers: await headers(),
    query: {
      limit: pageSize,
      offset: page * pageSize,
      searchValue: search,
      searchField: "email",
      searchOperator: "contains",
      sortBy: "createdAt",
      sortDirection: "desc",
    },
  });
}

const roleLevel: Record<UserRole, number> = {
  SUPER_ADMIN: 3,
  ADMIN: 2,
  STAFF:1,
};

export async function changeUserRole(
  userId: string,
  newRole: UserRole
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new Error("Unauthorized");
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
    },
  });

  if (!targetUser) {
    throw new Error("User not found");
  }

  const actorRole = session.user.role as UserRole;
  const targetRole = targetUser.role;

  // Cannot manage same or higher role
  if (
    roleLevel[actorRole] <= roleLevel[targetRole]
  ) {
    throw new Error(
      "You cannot modify this user"
    );
  }

  // Cannot assign same or higher role
  if (
    roleLevel[actorRole] <= roleLevel[newRole]
  ) {
    throw new Error(
      "You cannot assign this role"
    );
  }

  await auth.api.setRole({
    body: {
      userId,
      role: newRole,
    },
    headers: await headers()
  });

  return {
    success: true,
  };
}