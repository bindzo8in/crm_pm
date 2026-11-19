export const productKeys = {
  all: ["products"] as const,
  list: (query: {
    page: number;
    pageSize: number;
    search?: string;
    isActive?: boolean;
    sortDirection: "asc" | "desc";
  }) =>
    [
      ...productKeys.all,
      query.page,
      query.pageSize,
      query.search,
      query.isActive,
      query.sortDirection,
    ] as const,
};
