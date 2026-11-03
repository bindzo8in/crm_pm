export const uploadScopes = [
  "customer",
  "expense",
  "company",
  "bank-account",
  "account-profile",
  "attendance-profile",
  "proposal",
  "terms",
  "proposal-signature",
  "task",
] as const;

export type UploadScope = (typeof uploadScopes)[number];
