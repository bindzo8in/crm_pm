export type PlatformUserSortBy = "name" | "email" | "createdAt";
export type PlatformUserSortDirection = "asc" | "desc";

export type PlatformUserDirectoryUser = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  globalRole: string;
  createdAt: string;
  organizations: Array<{
    id: string;
    name: string;
    slug: string;
    role: string;
  }>;
};

export type PlatformUserDirectoryPage = {
  users: PlatformUserDirectoryUser[];
  total: number;
  page: number;
  pageCount: number;
  pageSize: number;
  search: string;
  sortBy: PlatformUserSortBy;
  sortDirection: PlatformUserSortDirection;
};
