import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { PlatformUserTable } from "@/components/platform/platform-user-table";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getPlatformUserDirectoryPage } from "@/lib/platform-user-directory";
import type { PlatformUserSortBy, PlatformUserSortDirection } from "@/lib/platform-user-directory-types";

export const metadata: Metadata = {
  title: "Platform users",
};

type PlatformUsersPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function buildHref({
  page,
  search,
  sortBy,
  direction,
}: {
  page: number;
  search: string;
  sortBy: PlatformUserSortBy;
  direction: PlatformUserSortDirection;
}) {
  const params = new URLSearchParams({
    page: String(page),
    sortBy,
    direction,
  });
  if (search) params.set("search", search);
  return `/platform/users?${params.toString()}`;
}

export default async function PlatformUsersPage({
  searchParams,
}: PlatformUsersPageProps) {
  const directory = await getPlatformUserDirectoryPage(await searchParams);
  const sortLinks: Record<PlatformUserSortBy, string> = {
    name: buildHref({
      page: 1,
      search: directory.search,
      sortBy: "name",
      direction:
        directory.sortBy === "name"
          ? directory.sortDirection === "asc"
            ? "desc"
            : "asc"
          : "asc",
    }),
    email: buildHref({
      page: 1,
      search: directory.search,
      sortBy: "email",
      direction:
        directory.sortBy === "email"
          ? directory.sortDirection === "asc"
            ? "desc"
            : "asc"
          : "asc",
    }),
    createdAt: buildHref({
      page: 1,
      search: directory.search,
      sortBy: "createdAt",
      direction:
        directory.sortBy === "createdAt"
          ? directory.sortDirection === "asc"
            ? "desc"
            : "asc"
          : "desc",
    }),
  };

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-8">
      <header>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Global users
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Platform-wide accounts and their organization memberships.
        </p>
      </header>

      <Card>
        <CardHeader>
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <CardTitle>Users</CardTitle>
              <CardDescription>
                {directory.total} account{directory.total === 1 ? "" : "s"} ·
                Organization member roles remain managed inside each organization.
              </CardDescription>
            </div>
            <form
              action="/platform/users"
              method="get"
              className="flex w-full gap-2 sm:max-w-md"
            >
              <input type="hidden" name="sortBy" value={directory.sortBy} />
              <input
                type="hidden"
                name="direction"
                value={directory.sortDirection}
              />
              <Input
                type="search"
                name="search"
                defaultValue={directory.search}
                placeholder="Search name or email"
                aria-label="Search users by name or email"
              />
              <Button type="submit">
                <Search data-icon="inline-start" />
                Search
              </Button>
            </form>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <PlatformUserTable
            users={directory.users}
            sortBy={directory.sortBy}
            sortDirection={directory.sortDirection}
            sortLinks={sortLinks}
          />
          <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
            <p className="text-sm text-muted-foreground">
              Page {directory.page} of {directory.pageCount}
            </p>
            <div className="flex gap-2">
              {directory.page > 1 ? (
                <Button asChild size="sm" variant="outline">
                  <Link
                    href={buildHref({
                      page: directory.page - 1,
                      search: directory.search,
                      sortBy: directory.sortBy,
                      direction: directory.sortDirection,
                    })}
                  >
                    <ChevronLeft data-icon="inline-start" />
                    Previous
                  </Link>
                </Button>
              ) : (
                <Button size="sm" variant="outline" disabled>
                  <ChevronLeft data-icon="inline-start" />
                  Previous
                </Button>
              )}
              {directory.page < directory.pageCount ? (
                <Button asChild size="sm" variant="outline">
                  <Link
                    href={buildHref({
                      page: directory.page + 1,
                      search: directory.search,
                      sortBy: directory.sortBy,
                      direction: directory.sortDirection,
                    })}
                  >
                    Next
                    <ChevronRight data-icon="inline-end" />
                  </Link>
                </Button>
              ) : (
                <Button size="sm" variant="outline" disabled>
                  Next
                  <ChevronRight data-icon="inline-end" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
