import { z } from "zod";

export const GlobalRole = {
  SUPER_ADMIN: "SUPER_ADMIN",
  USER: "USER",
} as const;

export const globalRoleSchema = z.enum([GlobalRole.SUPER_ADMIN, GlobalRole.USER]);

export type GlobalRole = (typeof GlobalRole)[keyof typeof GlobalRole];

export function isGlobalRole(value: unknown): value is GlobalRole {
  return globalRoleSchema.safeParse(value).success;
}

export function isPlatformSuperAdmin(value: unknown): value is "SUPER_ADMIN" {
  return value === "SUPER_ADMIN";
}
