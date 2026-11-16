import {
  MAX_ORGANIZATION_SLUG_LENGTH,
} from "@/lib/organization-slug";
import prisma from "@/lib/prisma";

export async function findAvailableOrganizationSlug(
  baseSlug: string,
): Promise<string> {
  const existingOrganization = await prisma.organization.findUnique({
    where: { slug: baseSlug },
    select: { id: true },
  });
  if (!existingOrganization) {
    return baseSlug;
  }

  for (let suffix = 2; ; suffix += 1) {
    const suffixText = `-${suffix}`;
    if (suffixText.length >= MAX_ORGANIZATION_SLUG_LENGTH) {
      throw new Error("Could not generate an available workspace address.");
    }

    const prefix = baseSlug
      .slice(0, MAX_ORGANIZATION_SLUG_LENGTH - suffixText.length)
      .replace(/-+$/, "");
    const candidate = `${prefix}${suffixText}`;
    const existingCandidate = await prisma.organization.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!existingCandidate) {
      return candidate;
    }
  }
}
