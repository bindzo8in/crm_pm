import type { Prisma } from "@/app/generated/prisma/client";

export type CustomerReadScope = {
  userId: string;
  canReadAll: boolean;
};

export function customerReadFilter(
  scope: CustomerReadScope,
): Prisma.CustomerWhereInput {
  return scope.canReadAll ? {} : { createdById: scope.userId };
}
