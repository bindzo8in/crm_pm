import type { ProjectStatus } from "@/app/generated/prisma/enums";

const allowedTransitions: Record<ProjectStatus, ProjectStatus[]> = {
  PLANNING: ["NOT_STARTED", "CANCELLED"],
  NOT_STARTED: ["IN_PROGRESS", "ON_HOLD", "CANCELLED"],
  IN_PROGRESS: ["ON_HOLD", "COMPLETED", "CANCELLED"],
  ON_HOLD: ["NOT_STARTED", "IN_PROGRESS", "CANCELLED"],
  COMPLETED: ["IN_PROGRESS"],
  CANCELLED: ["PLANNING"],
};

export function canTransitionProject(current: ProjectStatus, next: ProjectStatus) {
  return current === next || allowedTransitions[current].includes(next);
}
