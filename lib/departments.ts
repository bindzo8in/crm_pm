import { Department } from "@/app/generated/prisma/enums";
import type { Prisma } from "@/app/generated/prisma/client";

export type DepartmentMemberships = {
  department: Department | null;
  additionalDepartments: Department[];
};

export function getDepartmentMemberships(
  user: DepartmentMemberships,
): Department[] {
  return [
    ...new Set([
      ...(user.department ? [user.department] : []),
      ...user.additionalDepartments,
    ]),
  ];
}

export function formatDepartmentMemberships(user: DepartmentMemberships): string {
  const additionalDepartments = getDepartmentMemberships(user).filter(
    (department) => department !== user.department,
  );
  return [
    user.department ? `${user.department} (Primary)` : null,
    ...additionalDepartments,
  ]
    .filter((department): department is string => department !== null)
    .join(", ") || "Unassigned";
}

export function departmentMembershipWhere(
  department: Department,
): Prisma.UserWhereInput {
  return {
    OR: [
      { department },
      { additionalDepartments: { has: department } },
    ],
  };
}

export function normalizeAdditionalDepartments(
  primaryDepartment: Department | null,
  departments: Department[],
): Department[] {
  return [...new Set(departments)].filter(
    (department) => !primaryDepartment || department !== primaryDepartment,
  );
}
