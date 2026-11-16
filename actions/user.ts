"use server";

import { randomBytes } from "node:crypto";
import { z } from "zod";
import {
  Department,
  EmploymentStatus,
  EmploymentStatusAction,
  PaymentMethod,
  ProjectStatus,
  ProjectTaskStatusGroup,
  UserRole,
  WorkMode,
} from "@/app/generated/prisma/enums";
import { auth } from "@/lib/auth";
import {
  normalizeAdditionalDepartments,
} from "@/lib/departments";
import { GlobalRole } from "@/lib/global-role";
import { hasOrganizationPermission } from "@/lib/organization-authorization";

import { env } from "@/lib/env";
import prisma from "@/lib/prisma";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

const userListSchema = z.object({
  page: z.number().int().min(0),
  pageSize: z.number().int().min(1).max(100),
  search: z.string().trim().max(120).optional(),
  role: z.string().trim().regex(/^[a-z][a-z0-9_-]{0,62}$/).optional(),
  teamId: z.string().trim().min(1).max(128).optional(),
  emailVerified: z.boolean().optional(),
});

function validateDepartmentAssignments(
  assignment: {
    department: Department | null;
    additionalDepartments: Department[];
  },
  context: z.RefinementCtx,
) {
  if (
    new Set(assignment.additionalDepartments).size !==
    assignment.additionalDepartments.length
  ) {
    context.addIssue({
      code: "custom",
      path: ["additionalDepartments"],
      message: "Choose each additional department only once.",
    });
  }
  if (
    assignment.department &&
    assignment.additionalDepartments.includes(assignment.department)
  ) {
    context.addIssue({
      code: "custom",
      path: ["additionalDepartments"],
      message: "The primary department cannot also be an additional department.",
    });
  }
}

const createStaffSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.email().max(254),
  department: z.enum(Department),
  additionalDepartments: z
    .array(z.enum(Department))
    .max(Object.values(Department).length)
    .default([]),
}).superRefine(validateDepartmentAssignments);
const assignDepartmentSchema = z.object({
  department: z.enum(Department).nullable(),
  additionalDepartments: z
    .array(z.enum(Department))
    .max(Object.values(Department).length),
}).superRefine(validateDepartmentAssignments);

const userIdSchema = z.string().min(1).max(255);
const employmentStatusChangeSchema = z.object({
  userId: userIdSchema,
  effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().trim().min(1).max(1000),
});
const deactivateEmployeeSchema = employmentStatusChangeSchema.extend({
  reassignmentUserId: userIdSchema.nullable(),
});

function parseEffectiveDate(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value ||
    date > new Date()
  ) {
    throw new Error("Choose a valid effective date that is not in the future.");
  }
  return date;
}

const activeProjectWhere = {
  deletedAt: null,
  status: {
    notIn: [ProjectStatus.COMPLETED, ProjectStatus.CANCELLED],
  },
};

const openTaskWhere = {
  statusGroup: {
    notIn: [ProjectTaskStatusGroup.DONE, ProjectTaskStatusGroup.CLOSED],
  },
  project: {
    is: activeProjectWhere,
  },
};

async function getCurrentActor() {
  const session = await auth.api.getSession({ headers: await headers() });
  const organizationId = session?.session.activeOrganizationId;
  if (!session?.user || !organizationId) {
    throw new Error("Unauthorized");
  }

  const [user, membership] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true, employmentStatus: true },
    }),
    prisma.member.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId: session.user.id,
        },
      },
      select: { id: true },
    }),
  ]);
  if (!user || !membership || user.employmentStatus !== EmploymentStatus.ACTIVE) {
    throw new Error("Unauthorized");
  }

  return { ...user, organizationId };
}

async function requireOrganizationMember(organizationId: string, userId: string) {
  const membership = await prisma.member.findUnique({
    where: { organizationId_userId: { organizationId, userId } },
    select: { id: true },
  });
  if (!membership) {
    throw new Error("The user is not a member of the active organization.");
  }
}

export async function getUsers({
  page,
  pageSize,
  search,
  role,
  teamId,
  emailVerified,
}: {
  page: number;
  pageSize: number;
  search?: string;
  role?: string;
  teamId?: string;
  emailVerified?: boolean;
}) {
  const input = userListSchema.safeParse({
    page,
    pageSize,
    search,
    role,
    teamId,
    emailVerified,
  });
  if (!input.success) {
    throw new Error("Invalid user list filters.");
  }
  const actor = await getCurrentActor();
  if (!(await hasOrganizationPermission("users", "read"))) {
    throw new Error("Unauthorized");
  }

  const where = {
    organizationMemberships: {
      some: {
        organizationId: actor.organizationId,
        ...(input.data.role ? { role: input.data.role } : {}),
      },
    },
    ...(input.data.teamId
      ? {
          teamMemberships: {
            some: {
              teamId: input.data.teamId,
              team: { organizationId: actor.organizationId },
            },
          },
        }
      : {}),
    ...(input.data.search
      ? {
          OR: [
            { name: { contains: input.data.search, mode: "insensitive" as const } },
            { email: { contains: input.data.search, mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(input.data.emailVerified !== undefined
      ? { emailVerified: input.data.emailVerified }
      : {}),
  };
  const [users, total, verifiedTotal, teams, customRoles] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: input.data.page * input.data.pageSize,
      take: input.data.pageSize,
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        image: true,
        createdAt: true,
        organizationMemberships: {
          where: { organizationId: actor.organizationId },
          select: { role: true },
        },
        teamMemberships: {
          where: { team: { organizationId: actor.organizationId } },
          select: {
            team: { select: { id: true, name: true } },
          },
        },
      },
    }),
    prisma.user.count({ where }),
    prisma.user.count({ where: { ...where, emailVerified: true } }),
    prisma.team.findMany({
      where: { organizationId: actor.organizationId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.organizationRole.findMany({
      where: { organizationId: actor.organizationId },
      orderBy: { role: "asc" },
      select: { role: true },
    }),
  ]);
  return {
    users: users.map(({ organizationMemberships, teamMemberships, ...user }) => ({
      ...user,
      role: organizationMemberships[0]?.role ?? "member",
      teams: teamMemberships.map(({ team }) => team),
    })),
    roles: [
      "owner",
      "admin",
      "member",
      ...customRoles.map(({ role }) => role),
    ],
    teams,
    total,
    stats: {
      verified: verifiedTotal,
      customRoles: customRoles.length,
      teams: teams.length,
    },
  };
}

export async function createStaffAccount(input: {
  name: string;
  email: string;
  department: Department;
  additionalDepartments?: Department[];
}) {
  const parsedInput = createStaffSchema.safeParse(input);
  if (!parsedInput.success) {
    throw new Error("Enter a valid name, email, and department.");
  }

  await getCurrentActor();
  if (!(await hasOrganizationPermission("member", "create"))) {
    throw new Error("You are not allowed to create organization members.");
  }
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  const organizationId = session?.session.activeOrganizationId;
  if (!organizationId) {
    throw new Error("Select an organization before creating a staff account.");
  }

  const email = parsedInput.data.email.trim().toLowerCase();
  const existingUser = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { id: true },
  });
  if (existingUser) {
    throw new Error("An account already exists for this email. Assign its department from the users list.");
  }

  // The internal Better Auth call omits request headers only after this action has authorized its caller.
  const created = await auth.api.createUser({
    body: {
      name: parsedInput.data.name,
      email,
      password: randomBytes(32).toString("base64url"),
      data: { department: parsedInput.data.department },
    },
  });

  try {
    await auth.api.addMember({
      body: {
        organizationId,
        userId: created.user.id,
        role: "member",
      },
      headers: requestHeaders,
    });
  } catch (error) {
    console.error("New staff account organization membership assignment failed.", {
      userId: created.user.id,
      organizationId,
      error,
    });
    throw new Error(
      "The staff account was created, but its organization membership could not be saved. Review the account before sending an invitation.",
    );
  }

  try {
    await prisma.user.update({
      where: { id: created.user.id },
      data: {
        additionalDepartments: normalizeAdditionalDepartments(
          parsedInput.data.department,
          parsedInput.data.additionalDepartments,
        ),
      },
    });
  } catch (error) {
    console.error("New staff account department membership assignment failed.", {
      userId: created.user.id,
      error,
    });
    throw new Error(
      "The staff account was created, but its department memberships could not be saved. Review the account before sending an invitation.",
    );
  }

  try {
    await auth.api.requestPasswordReset({
      body: {
        email,
        redirectTo: `${env.NEXT_PUBLIC_SITE_URL}/reset-password?flow=invitation`,
      },
    });
  } catch (error) {
    console.error("Staff account invitation email delivery failed.", {
      userId: created.user.id,
      error,
    });
    throw new Error(
      "The staff account was created, but its invitation email could not be sent. The staff member can use Forgot password on the sign-in page to set a password and verify their email.",
    );
  }

  revalidatePath("/dashboard/users");
  return { success: true };
}

export async function changeUserRole(
  userId: string,
  newRole: string
) {
  const parsedUserId = userIdSchema.safeParse(userId);
  const parsedRole = z.string().trim().min(1).max(64).safeParse(newRole);
  if (!parsedUserId.success || !parsedRole.success) {
    throw new Error("Invalid user or role.");
  }
  const organizationRole =
    parsedRole.data === "ADMIN"
      ? "admin"
      : parsedRole.data === "STAFF"
        ? "member"
        : parsedRole.data.toLowerCase();
  if (!/^[a-z][a-z0-9_-]*$/.test(organizationRole)) {
    throw new Error("Invalid organization role.");
  }
  if (parsedRole.data.toUpperCase() === GlobalRole.SUPER_ADMIN) {
    throw new Error("Platform super-admin access cannot be assigned as an organization role.");
  }
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  const organizationId = session?.session.activeOrganizationId;
  if (!session?.user || !organizationId) {
    throw new Error("Select an organization before changing member roles.");
  }
  const targetMember = await prisma.member.findUnique({
    where: {
      organizationId_userId: {
        organizationId,
        userId: parsedUserId.data,
      },
    },
    select: { id: true },
  });
  if (!targetMember) {
    throw new Error("The user is not a member of the active organization.");
  }

  await auth.api.updateMemberRole({
    body: {
      memberId: targetMember.id,
      role: organizationRole,
      organizationId,
    },
    headers: requestHeaders,
  });

  return {
    success: true,
  };
}

export async function assignUserDepartment(
  userId: string,
  departmentInput: {
    department: Department | null;
    additionalDepartments: Department[];
  },
) {
  const parsedUserId = userIdSchema.safeParse(userId);
  const parsedDepartment = assignDepartmentSchema.safeParse(departmentInput);
  if (!parsedUserId.success || !parsedDepartment.success) {
    throw new Error("Invalid user or department.");
  }

  const actor = await getCurrentActor();
  if (!(await hasOrganizationPermission("users", "assign-department"))) {
    throw new Error("You are not allowed to assign user departments.");
  }
  await requireOrganizationMember(actor.organizationId, parsedUserId.data);

  const targetUser = await prisma.user.findUnique({
    where: { id: parsedUserId.data },
    select: { id: true },
  });

  if (!targetUser) {
    throw new Error("User not found");
  }

  await prisma.user.update({
    where: { id: parsedUserId.data },
    data: {
      department: parsedDepartment.data.department,
      additionalDepartments: normalizeAdditionalDepartments(
        parsedDepartment.data.department,
        parsedDepartment.data.additionalDepartments,
      ),
    },
  });

  revalidatePath("/dashboard/users");
  revalidatePath("/dashboard/attendance");
  revalidatePath("/attendance");
  revalidatePath("/dashboard/leaves");
  revalidatePath("/dashboard/holidays");
  revalidatePath("/dashboard/account");
  revalidatePath("/attendance/profile");
  return {
    success: true,
  };
}

export async function assignUserWorkMode(
  userId: string,
  workMode: WorkMode
) {
  const actor = await getCurrentActor();
  if (!(await hasOrganizationPermission("users", "update"))) {
    throw new Error("You are not allowed to assign user work mode.");
  }

  await requireOrganizationMember(actor.organizationId, userId);
  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (!targetUser) {
    throw new Error("User not found");
  }

  if (targetUser.role === UserRole.SUPER_ADMIN && actor.role !== UserRole.SUPER_ADMIN) {
    throw new Error("You cannot modify this user's work mode.");
  }

  await prisma.user.update({
    where: { id: userId },
    data: { workMode },
  });

  return {
    success: true,
  };
}

export async function setUserAttendanceReportInclusion(
  userId: string,
  includeInAttendanceReports: boolean,
) {
  const parsedUserId = userIdSchema.safeParse(userId);
  const parsedInclusion = z.boolean().safeParse(includeInAttendanceReports);
  if (!parsedUserId.success || !parsedInclusion.success) {
    throw new Error("Invalid user or attendance report setting.");
  }

  const actor = await getCurrentActor();
  if (!(await hasOrganizationPermission("attendance", "manage"))) {
    throw new Error("You are not allowed to manage attendance report inclusion.");
  }
  await requireOrganizationMember(actor.organizationId, parsedUserId.data);

  const target = await prisma.user.findUnique({
    where: { id: parsedUserId.data },
    select: { id: true, role: true },
  });
  if (!target) {
    throw new Error("User not found.");
  }
  if (target.role === UserRole.SUPER_ADMIN && actor.role !== UserRole.SUPER_ADMIN) {
    throw new Error("You cannot modify this user's attendance report setting.");
  }

  await prisma.user.update({
    where: { id: parsedUserId.data },
    data: { includeInAttendanceReports: parsedInclusion.data },
  });

  revalidatePath("/dashboard/users");
  revalidatePath("/dashboard/attendance");
  revalidatePath("/attendance");
  return { success: true };
}

export async function updateUserPayrollDetails(
  userId: string,
  data: {
    designation?: string | null;
    dateOfJoining?: string | null;
    employmentType?: "PERMANENT" | "CONTRACT" | "PROBATION" | "INTERN" | null;
    annualCtc?: string | null;
    bankName?: string | null;
    bankAccountNo?: string | null;
    bankIfsc?: string | null;
    bankAccountType?: "SAVINGS" | "CURRENT" | null;
    panNo?: string | null;
    aadhaarNo?: string | null;
    costCenter?: string | null;
    uanNo?: string | null;
    pfNo?: string | null;
    esiNo?: string | null;
    pfEligible?: boolean;
    esiEligible?: boolean;
    taxRegime?: "OLD" | "NEW";
    paymentMethod?: "BANK_TRANSFER" | "UPI" | "CHEQUE" | "CASH" | "OTHER";
  }
) {
  const actor = await getCurrentActor();
  if (!(await hasOrganizationPermission("salary", "update"))) {
    throw new Error("You are not allowed to update user payroll details.");
  }

  await requireOrganizationMember(actor.organizationId, userId);
  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
    },
  });

  if (!targetUser) {
    throw new Error("User not found");
  }

  if (targetUser.role === UserRole.SUPER_ADMIN && actor.role !== UserRole.SUPER_ADMIN) {
    throw new Error("You cannot modify this user's payroll details");
  }

  const parsedAadhaar = data.aadhaarNo?.replace(/\s/g, "") || null;
  const parsedPan = data.panNo?.trim().toUpperCase() || null;
  const parsedIfsc = data.bankIfsc?.trim().toUpperCase() || null;
  const parsedDate = data.dateOfJoining ? new Date(`${data.dateOfJoining}T00:00:00.000Z`) : null;

  if (parsedPan && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(parsedPan)) {
    throw new Error("Enter a valid PAN number.");
  }
  if (parsedIfsc && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(parsedIfsc)) {
    throw new Error("Enter a valid IFSC code.");
  }
  if (parsedAadhaar && !/^[0-9]{12}$/.test(parsedAadhaar)) {
    throw new Error("Enter a valid 12-digit Aadhaar number.");
  }
  if (parsedDate && Number.isNaN(parsedDate.getTime())) {
    throw new Error("Enter a valid date of joining.");
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      ...data,
      dateOfJoining: parsedDate,
      annualCtc: data.annualCtc ? data.annualCtc : null,
      panNo: parsedPan,
      aadhaarNo: parsedAadhaar,
      bankIfsc: parsedIfsc,
    },
  });

  return {
    success: true,
  };
}

export async function getEmployeeOffboardingPreview(userId: string) {
  const parsedUserId = userIdSchema.safeParse(userId);
  if (!parsedUserId.success) {
    throw new Error("Invalid user.");
  }

  const actor = await getCurrentActor();
  if (!(await hasOrganizationPermission("users", "update"))) {
    throw new Error("You are not allowed to manage this employee.");
  }
  await requireOrganizationMember(actor.organizationId, parsedUserId.data);
  const target = await prisma.user.findUnique({
    where: { id: parsedUserId.data },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      department: true,
      employmentStatus: true,
      employmentEndedAt: true,
    },
  });
  if (!target) {
    throw new Error("User not found.");
  }
  if (
    actor.id === target.id ||
    (target.role === UserRole.SUPER_ADMIN && actor.role !== UserRole.SUPER_ADMIN)
  ) {
    throw new Error("You are not allowed to manage this employee.");
  }
  if (target.employmentStatus !== EmploymentStatus.ACTIVE) {
    return {
      target,
      work: {
        customerCount: 0,
        projectCount: 0,
        taskCount: 0,
        memberCount: 0,
      },
      replacementCandidates: [],
    };
  }

  const [
    customerCount,
    projectCount,
    taskCount,
    memberCount,
    replacementCandidates,
  ] = await Promise.all([
    prisma.customer.count({
      where: { assignedToId: target.id, deletedAt: null },
    }),
    prisma.project.count({
      where: { projectManagerId: target.id, ...activeProjectWhere },
    }),
    prisma.projectTask.count({
      where: { assigneeId: target.id, ...openTaskWhere },
    }),
    prisma.projectMember.count({
      where: { userId: target.id, project: { is: activeProjectWhere } },
    }),
    prisma.user.findMany({
      where: {
        id: { not: target.id },
        employmentStatus: EmploymentStatus.ACTIVE,
        banned: { not: true },
        organizationMemberships: {
          some: { organizationId: actor.organizationId },
        },
        ...(actor.role === UserRole.SUPER_ADMIN
          ? {}
          : { role: { not: UserRole.SUPER_ADMIN } }),
      },
      orderBy: [{ name: "asc" }, { email: "asc" }],
      take: 100,
      select: { id: true, name: true, email: true, role: true, department: true },
    }),
  ]);

  return {
    target,
    work: { customerCount, projectCount, taskCount, memberCount },
    replacementCandidates,
  };
}

export async function getEmployeeStatusHistory(userId: string) {
  const parsedUserId = userIdSchema.safeParse(userId);
  if (!parsedUserId.success) {
    throw new Error("Invalid user.");
  }

  const actor = await getCurrentActor();
  if (!(await hasOrganizationPermission("users", "read"))) {
    throw new Error("You are not allowed to view this employee's status history.");
  }
  await requireOrganizationMember(actor.organizationId, parsedUserId.data);
  const target = await prisma.user.findUnique({
    where: { id: parsedUserId.data },
    select: { id: true },
  });
  if (!target || actor.id === target.id) {
    throw new Error("You are not allowed to view this employee's status history.");
  }

  return prisma.employeeStatusHistory.findMany({
    where: { userId: target.id },
    orderBy: [{ effectiveAt: "desc" }, { changedAt: "desc" }],
    take: 50,
    select: {
      id: true,
      action: true,
      effectiveAt: true,
      changedAt: true,
      reason: true,
      reassignedCustomerCount: true,
      reassignedProjectCount: true,
      reassignedTaskCount: true,
      reassignedMemberCount: true,
      changedBy: { select: { name: true, email: true } },
      reassignedTo: { select: { name: true, email: true } },
    },
  });
}

export async function deactivateEmployee(input: {
  userId: string;
  effectiveDate: string;
  reason: string;
  reassignmentUserId: string | null;
}) {
  const parsedInput = deactivateEmployeeSchema.safeParse(input);
  if (!parsedInput.success) {
    throw new Error("Enter a valid effective date and reason.");
  }

  const actor = await getCurrentActor();
  if (!(await hasOrganizationPermission("users", "update"))) {
    throw new Error("You are not allowed to deactivate this employee.");
  }
  const effectiveAt = parseEffectiveDate(parsedInput.data.effectiveDate);

  await prisma.$transaction(async (tx) => {
    const target = await tx.user.findUnique({
      where: { id: parsedInput.data.userId },
      select: { id: true, role: true, employmentStatus: true },
    });
    if (!target) {
      throw new Error("User not found.");
    }
    const targetMembership = await tx.member.findUnique({
      where: {
        organizationId_userId: {
          organizationId: actor.organizationId,
          userId: target.id,
        },
      },
      select: { id: true },
    });
    if (
      !targetMembership ||
      actor.id === target.id ||
      (target.role === UserRole.SUPER_ADMIN && actor.role !== UserRole.SUPER_ADMIN)
    ) {
      throw new Error("You are not allowed to deactivate this employee.");
    }
    if (target.employmentStatus !== EmploymentStatus.ACTIVE) {
      throw new Error("This employee is already inactive.");
    }

    const [customerCount, projectCount, taskCount, memberCount] =
      await Promise.all([
        tx.customer.count({
          where: { assignedToId: target.id, deletedAt: null },
        }),
        tx.project.count({
          where: { projectManagerId: target.id, ...activeProjectWhere },
        }),
        tx.projectTask.count({
          where: { assigneeId: target.id, ...openTaskWhere },
        }),
        tx.projectMember.count({
          where: { userId: target.id, project: { is: activeProjectWhere } },
        }),
      ]);
    const hasWorkToReassign =
      customerCount + projectCount + taskCount + memberCount > 0;
    const reassignmentUserId = parsedInput.data.reassignmentUserId;

    if (hasWorkToReassign && !reassignmentUserId) {
      throw new Error("Choose an active staff member to receive this employee's work.");
    }

    if (reassignmentUserId) {
      const replacement = await tx.user.findUnique({
        where: { id: reassignmentUserId },
        select: { id: true, role: true, employmentStatus: true, banned: true },
      });
      const replacementMembership = replacement
        ? await tx.member.findUnique({
            where: {
              organizationId_userId: {
                organizationId: actor.organizationId,
                userId: replacement.id,
              },
            },
            select: { id: true },
          })
        : null;
      if (
        !replacement ||
        !replacementMembership ||
        replacement.id === target.id ||
        replacement.employmentStatus !== EmploymentStatus.ACTIVE ||
        replacement.banned === true ||
        (replacement.role === UserRole.SUPER_ADMIN &&
          actor.role !== UserRole.SUPER_ADMIN)
      ) {
        throw new Error("Choose an eligible, active employee for reassignment.");
      }

      await tx.customer.updateMany({
        where: { assignedToId: target.id, deletedAt: null },
        data: { assignedToId: replacement.id },
      });
      await tx.project.updateMany({
        where: { projectManagerId: target.id, ...activeProjectWhere },
        data: { projectManagerId: replacement.id },
      });
      await tx.projectTask.updateMany({
        where: { assigneeId: target.id, ...openTaskWhere },
        data: { assigneeId: replacement.id },
      });

      const activeMemberships = await tx.projectMember.findMany({
        where: { userId: target.id, project: { is: activeProjectWhere } },
        select: { projectId: true, role: true },
      });
      if (activeMemberships.length > 0) {
        await tx.projectMember.createMany({
          data: activeMemberships.map(({ projectId, role }) => ({
            projectId,
            userId: replacement.id,
            role,
          })),
          skipDuplicates: true,
        });
      }
    } else {
      await tx.customer.updateMany({
        where: { assignedToId: target.id, deletedAt: null },
        data: { assignedToId: null },
      });
      await tx.project.updateMany({
        where: { projectManagerId: target.id, ...activeProjectWhere },
        data: { projectManagerId: null },
      });
      await tx.projectTask.updateMany({
        where: { assigneeId: target.id, ...openTaskWhere },
        data: { assigneeId: null },
      });
    }

    await tx.projectMember.deleteMany({ where: { userId: target.id } });
    await tx.session.deleteMany({ where: { userId: target.id } });
    await tx.user.update({
      where: { id: target.id },
      data: {
        employmentStatus: EmploymentStatus.INACTIVE,
        employmentEndedAt: effectiveAt,
        includeInPayroll: false,
      },
    });
    await tx.employeeStatusHistory.create({
      data: {
        userId: target.id,
        action: EmploymentStatusAction.DEACTIVATED,
        effectiveAt,
        reason: parsedInput.data.reason,
        changedById: actor.id,
        reassignedToId: reassignmentUserId,
        reassignedCustomerCount: customerCount,
        reassignedProjectCount: projectCount,
        reassignedTaskCount: taskCount,
        reassignedMemberCount: memberCount,
      },
    });
  });

  revalidatePath("/dashboard/users");
  revalidatePath("/dashboard/customers");
  revalidatePath("/dashboard/projects");
  return { success: true };
}

export async function reactivateEmployee(input: {
  userId: string;
  effectiveDate: string;
  reason: string;
}) {
  const parsedInput = employmentStatusChangeSchema.safeParse(input);
  if (!parsedInput.success) {
    throw new Error("Enter a valid effective date and reason.");
  }

  const actor = await getCurrentActor();
  if (!(await hasOrganizationPermission("users", "update"))) {
    throw new Error("You are not allowed to reactivate this employee.");
  }
  const effectiveAt = parseEffectiveDate(parsedInput.data.effectiveDate);

  await prisma.$transaction(async (tx) => {
    const target = await tx.user.findUnique({
      where: { id: parsedInput.data.userId },
      select: { id: true, role: true, employmentStatus: true },
    });
    if (!target) {
      throw new Error("User not found.");
    }
    const targetMembership = await tx.member.findUnique({
      where: {
        organizationId_userId: {
          organizationId: actor.organizationId,
          userId: target.id,
        },
      },
      select: { id: true },
    });
    if (
      !targetMembership ||
      actor.id === target.id ||
      (target.role === UserRole.SUPER_ADMIN && actor.role !== UserRole.SUPER_ADMIN)
    ) {
      throw new Error("You are not allowed to reactivate this employee.");
    }
    if (target.employmentStatus !== EmploymentStatus.INACTIVE) {
      throw new Error("This employee is already active.");
    }

    await tx.user.update({
      where: { id: target.id },
      data: {
        employmentStatus: EmploymentStatus.ACTIVE,
        employmentEndedAt: null,
      },
    });
    await tx.employeeStatusHistory.create({
      data: {
        userId: target.id,
        action: EmploymentStatusAction.REACTIVATED,
        effectiveAt,
        reason: parsedInput.data.reason,
        changedById: actor.id,
      },
    });
  });

  revalidatePath("/dashboard/users");
  return { success: true };
}