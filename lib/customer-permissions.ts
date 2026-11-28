import type { Prisma } from "@/app/generated/prisma/client";

export type CustomerReadScope = {
  userId: string;
  organizationId: string;
  canReadAll: boolean;
};

export function customerReadFilter(
  scope: CustomerReadScope,
): Prisma.CustomerWhereInput {
  return {
    organizationId: scope.organizationId,
    ...(scope.canReadAll ? {} : { createdById: scope.userId }),
  };
}
