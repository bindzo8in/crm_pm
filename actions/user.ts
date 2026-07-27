"use server";

import { UserRole, Department } from "@/app/generated/prisma/enums";
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
  const reqHeaders = await headers();
  const session = await auth.api.getSession({
    headers: reqHeaders,
  });

  if (!session?.user?.role || (session.user.role !== UserRole.SUPER_ADMIN && session.user.role !== UserRole.ADMIN)) {
    throw new Error("Unauthorized");
  }

  const authUsers = await auth.api.listUsers({
    headers: reqHeaders,
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

  if (!authUsers?.users || authUsers.users.length === 0) {
    return {
      ...authUsers,
      users: [],
    };
  }

  const userIds = authUsers.users.map((u) => u.id);
  const prismaUsers = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, department: true },
  });

  const deptMap = new Map(prismaUsers.map((u) => [u.id, u.department]));

  const usersWithDept = authUsers.users.map((u) => ({
    ...u,
    department: deptMap.get(u.id) || null,
  }));

  return {
    ...authUsers,
    users: usersWithDept,
  };
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

export async function assignUserDepartment(
  userId: string,
  department: Department | null
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new Error("Unauthorized");
  }

  const actorRole = session.user.role as UserRole;
  if (actorRole !== UserRole.SUPER_ADMIN && actorRole !== UserRole.ADMIN) {
    throw new Error("Only admins can assign user departments.");
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

  const targetRole = targetUser.role;

  // Cannot modify user with same or higher role
  if (roleLevel[actorRole] <= roleLevel[targetRole]) {
    throw new Error("You cannot modify this user's department");
  }

  await prisma.user.update({
    where: { id: userId },
    data: { department },
  });

  return {
    success: true,
  };
}