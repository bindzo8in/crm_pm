import "server-only";

import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { isPlatformSuperAdmin } from "@/lib/global-role";
import { listPlatformUsers } from "@/repositories/platform-user-repository";
import type {
  PlatformUserDirectoryPage,
  PlatformUserSortBy,
  PlatformUserSortDirection,
} from "@/lib/platform-user-directory-types";

const querySchema = z.object({
  page: z
    .string()
    .regex(/^\d+$/)
    .optional()
    .transform((value) => Number(value ?? "1"))
    .pipe(z.number().int().min(1).max(100_000)),
  search: z.string().trim().max(120).optional().transform((value) => value ?? ""),
  sortBy: z
    .enum(["name", "email", "createdAt"])
    .optional()
    .transform((value): PlatformUserSortBy => value ?? "createdAt"),
  direction: z
    .enum(["asc", "desc"])
    .optional()
    .transform((value): PlatformUserSortDirection => value ?? "desc"),
});

export async function getPlatformUserDirectoryPage(
  query: unknown,
): Promise<PlatformUserDirectoryPage> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user || !isPlatformSuperAdmin(session.user.role)) {
    throw new Error("Unauthorized");
  }

  const parsed = querySchema.safeParse(query);
  if (!parsed.success) {
    throw new Error("Invalid platform user directory filters.");
  }

  const pageSize = 25;
  const result = await listPlatformUsers({
    page: parsed.data.page,
    pageSize,
    search: parsed.data.search,
    sortBy: parsed.data.sortBy,
    sortDirection: parsed.data.direction,
  });

  return {
    ...result,
    pageSize,
    search: parsed.data.search,
    sortBy: parsed.data.sortBy,
    sortDirection: parsed.data.direction,
  };
}
