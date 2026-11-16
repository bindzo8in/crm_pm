export function isOrganizationSetupOwner(role: string | null | undefined) {
  return role === "owner";
}
