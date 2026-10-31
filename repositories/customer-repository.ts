import prisma from "@/lib/prisma";

export async function findActiveCustomerByDisplayName(
  displayName: string,
  excludeCustomerId?: string
) {
  const excludedCustomerId = excludeCustomerId ?? null;
  const rows = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT "id"
    FROM "Customer"
    WHERE "deletedAt" IS NULL
      AND LOWER(REGEXP_REPLACE(BTRIM("displayName"), '[[:space:]]+', ' ', 'g'))
        = LOWER(REGEXP_REPLACE(BTRIM(${displayName}), '[[:space:]]+', ' ', 'g'))
      AND (${excludedCustomerId}::text IS NULL OR "id" <> ${excludedCustomerId}::text)
    LIMIT 1
  `;

  return rows[0] ?? null;
}
