import prisma from "@/lib/prisma";
import type {
  PlatformUserDirectoryUser,
  PlatformUserSortBy,
  PlatformUserSortDirection,
} from "@/lib/platform-user-directory-types";

type ListPlatformUsersInput = {
  page: number;
  pageSize: number;
  search: string;
  sortBy: PlatformUserSortBy;
  sortDirection: PlatformUserSortDirection;
};

export async function listPlatformUsers({
  page,
  pageSize,
  search,
  sortBy,
  sortDirection,
}: ListPlatformUsersInput) {
  const where = search
    ? {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { email: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : {};

  const total = await prisma.user.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, pageCount);
  const primaryOrderBy =
    sortBy === "name"
      ? { name: sortDirection }
      : sortBy === "email"
        ? { email: sortDirection }
        : { createdAt: sortDirection };

  const records = await prisma.user.findMany({
    where,
    skip: (currentPage - 1) * pageSize,
    take: pageSize,
    orderBy: [primaryOrderBy, { id: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      emailVerified: true,
      role: true,
      createdAt: true,
      organizationMemberships: {
        select: {
          role: true,
          organization: {
            select: { id: true, name: true, slug: true },
          },
        },
        orderBy: { organization: { name: "asc" } },
      },
    },
  });

  const users: PlatformUserDirectoryUser[] = records.map((record) => ({
    id: record.id,
    name: record.name,
    email: record.email,
    emailVerified: record.emailVerified,
    globalRole: record.role,
    createdAt: record.createdAt.toISOString(),
    organizations: record.organizationMemberships.map((membership) => ({
      id: membership.organization.id,
      name: membership.organization.name,
      slug: membership.organization.slug,
      role: membership.role,
    })),
  }));

  return {
    users,
    total,
    page: currentPage,
    pageCount,
  };
}
