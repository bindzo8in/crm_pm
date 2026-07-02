import { ProposalQuerySchema } from "@/lib/schemas/proposal-schema";

export const proposalKeys = {
  all: ["proposals"] as const,
  lists: () => [...proposalKeys.all, "list"] as const,
  list: (filters: ProposalQuerySchema) =>
    [...proposalKeys.lists(), filters] as const,
  details: () => [...proposalKeys.all, "detail"] as const,
  detail: (id: string) => [...proposalKeys.details(), id] as const,
};
