import slugify from "slugify";
import { z } from "zod";

export const MAX_ORGANIZATION_SLUG_LENGTH = 48;

export const organizationSlugSchema = z
  .string()
  .min(1, "Enter a workspace address.")
  .max(MAX_ORGANIZATION_SLUG_LENGTH)
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Use lowercase letters, numbers, and hyphens for the workspace address.",
  );

export function organizationSlugFromName(name: string): string {
  const slug = slugify(name, {
    lower: true,
    strict: true,
    trim: true,
  })
    .slice(0, MAX_ORGANIZATION_SLUG_LENGTH)
    .replace(/-+$/, "");

  return slug || "organization";
}
