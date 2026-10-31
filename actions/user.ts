"use server";

import { randomBytes } from "node:crypto";
import { z } from "zod";
import {
  Department,
  EmploymentStatus,
  EmploymentStatusAction,
  PaymentMethod,
  ProjectStatus,
  ProjectTaskStatus,
  UserRole,
  WorkMode,
} from "@/app/generated/prisma/enums";
import { auth } from "@/lib/auth";
import {
  canAssignUserDepartment,
  canManageUser,
  canManageUserDirectory,
  canManageEmploymentStatus,
  roleLevel,
} from "@/lib/permissions";

function normalizePayrollPaymentMethod(method: PaymentMethod | null | undefined) {
  switch (method) {
    case "UPI":
    case "CHEQUE":
    case "CASH":
    case "OTHER":
      return method;
    default:
      return "BANK_TRANSFER" as const;
  }
}
import { env } from "@/lib/env";
import prisma from "@/lib/prisma";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

const userListSchema = z.object({
  page: z.number().int().min(0),
  pageSize: z.number().int().min(1).max(100),
  search: z.string().trim().max(120).optional(),
});

const createStaffSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.email().max(254),
  department: z.enum(Department),
});

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
  status: {
    notIn: [ProjectTaskStatus.DONE, ProjectTaskStatus.CANCELLED],
  },
  project: {
    is: activeProjectWhere,
  },
};

async function getCurrentActor() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    throw new Error("Unauthorized");
  }

  const actor = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, department: true, employmentStatus: true },
  });
  if (!actor || actor.employmentStatus !== EmploymentStatus.ACTIVE) {
    throw new Error("Unauthorized");
  }

  return actor;
}

export async function getUsers({
  page,
  pageSize,
  search,
}: {
  page: number;
  pageSize: number;
  search?: string;
}) {
  const input = userListSchema.safeParse({ page, pageSize, search });
  if (!input.success) {
    throw new Error("Invalid user list filters.");
  }
  const actor = await getCurrentActor();
  if (!canManageUserDirectory(actor.role, actor.department)) {
    throw new Error("Unauthorized");
  }

  const where = input.data.search
    ? {
        OR: [
          { name: { contains: input.data.search, mode: "insensitive" as const } },
          { email: { contains: input.data.search, mode: "insensitive" as const } },
        ],
      }
    : {};
  const [users, total, activeTotal, verifiedTotal, departmentRows] = await Promise.all([
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
        updatedAt: true,
        role: true,
        employmentStatus: true,
        employmentEndedAt: true,
        banned: true,
        banReason: true,
        banExpires: true,
        department: true,
        workMode: true,
      },
    }),
    prisma.user.count({ where }),
    prisma.user.count({ where: { ...where, employmentStatus: EmploymentStatus.ACTIVE } }),
    prisma.user.count({ where: { ...where, emailVerified: true } }),
    prisma.user.groupBy({
      by: ["department"],
      where,
      _count: { _all: true },
    }),
  ]);
  const isPayrollManager =
    actor.role === UserRole.SUPER_ADMIN || actor.role === UserRole.ADMIN;
  const payrollUsers = isPayrollManager && users.length > 0
    ? await prisma.user.findMany({
        where: { id: { in: users.map(({ id }) => id) } },
        select: {
          id: true,
          employeeId: true,
          designation: true,
          dateOfJoining: true,
          employmentType: true,
          annualCtc: true,
          bankName: true,
          bankAccountNo: true,
          bankIfsc: true,
          bankAccountType: true,
          panNo: true,
          aadhaarNo: true,
          costCenter: true,
          uanNo: true,
          pfNo: true,
          esiNo: true,
          pfEligible: true,
          esiEligible: true,
          taxRegime: true,
          paymentMethod: true,
        },
      })
    : [];
  const payrollByUserId = new Map(
    payrollUsers.map(({ id, ...payroll }) => [id, payroll]),
  );
  return {
    users: users.map((user) => ({
      ...user,
      workMode: user.workMode ?? WorkMode.OFFICE,
      employeeId: payrollByUserId.get(user.id)?.employeeId ?? null,
      designation: payrollByUserId.get(user.id)?.designation ?? null,
      dateOfJoining: payrollByUserId.get(user.id)?.dateOfJoining ?? null,
      employmentType: payrollByUserId.get(user.id)?.employmentType ?? null,
      annualCtc: payrollByUserId.get(user.id)?.annualCtc?.toString() ?? null,
      bankName: payrollByUserId.get(user.id)?.bankName ?? null,
      bankAccountNo: payrollByUserId.get(user.id)?.bankAccountNo ?? null,
      bankIfsc: payrollByUserId.get(user.id)?.bankIfsc ?? null,
      bankAccountType: payrollByUserId.get(user.id)?.bankAccountType ?? null,
      panNo: payrollByUserId.get(user.id)?.panNo ?? null,
      aadhaarNo: payrollByUserId.get(user.id)?.aadhaarNo ?? null,
      costCenter: payrollByUserId.get(user.id)?.costCenter ?? null,
      uanNo: payrollByUserId.get(user.id)?.uanNo ?? null,
      pfNo: payrollByUserId.get(user.id)?.pfNo ?? null,
      esiNo: payrollByUserId.get(user.id)?.esiNo ?? null,
      pfEligible: payrollByUserId.get(user.id)?.pfEligible ?? false,
      esiEligible: payrollByUserId.get(user.id)?.esiEligible ?? false,
      taxRegime: payrollByUserId.get(user.id)?.taxRegime ?? "NEW",
      paymentMethod: normalizePayrollPaymentMethod(payrollByUserId.get(user.id)?.paymentMethod),
    })),
    total,
    stats: {
      active: activeTotal,
      verified: verifiedTotal,
      departments: departmentRows
        .filter((row) => row.department)
        .map((row) => ({
          department: row.department as Department,
          count: row._count._all,
        })),
    },
  };
}

export async function createStaffAccount(input: {
  name: string;
  email: string;
  department: Department;
}) {
  const parsedInput = createStaffSchema.safeParse(input);
  if (!parsedInput.success) {
    throw new Error("Enter a valid name, email, and department.");
  }

  const actor = await getCurrentActor();
  if (!canManageUserDirectory(actor.role, actor.department)) {
    throw new Error("You are not allowed to create staff accounts.");
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
      role: UserRole.STAFF,
      data: { department: parsedInput.data.department },
    },
  });

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
  newRole: UserRole
) {
  const parsedUserId = userIdSchema.safeParse(userId);
  const parsedRole = z.enum(UserRole).safeParse(newRole);
  if (!parsedUserId.success || !parsedRole.success) {
    throw new Error("Invalid user or role.");
  }
  const actor = await getCurrentActor();

  const targetUser = await prisma.user.findUnique({
    where: { id: parsedUserId.data },
    select: {
      role: true,
    },
  });

  if (!targetUser) {
    throw new Error("User not found");
  }

  const actorRole = actor.role;
  const targetRole = targetUser.role;
  if (!canManageUser(actorRole, targetRole)) {
    throw new Error("You cannot modify this user.");
  }

  if (
    actorRole !== UserRole.SUPER_ADMIN &&
    (actorRole === UserRole.STAFF || !canManageUser(actorRole, parsedRole.data))
  ) {
    throw new Error("You cannot assign this role.");
  }

  await auth.api.setRole({
    body: {
      userId: parsedUserId.data,
      role: parsedRole.data,
    },
    headers: await headers()
  });

  return {
    success: true,
  };
}

export async function assignUserDepartment(
  userId: string,
  department: Department | null
) {
  const parsedUserId = userIdSchema.safeParse(userId);
  const parsedDepartment = z.enum(Department).nullable().safeParse(department);
  if (!parsedUserId.success || !parsedDepartment.success) {
    throw new Error("Invalid user or department.");
  }

  const actor = await getCurrentActor();
  if (!canManageUserDirectory(actor.role, actor.department)) {
    throw new Error("You are not allowed to assign user departments.");
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: parsedUserId.data },
    select: {
      role: true,
    },
  });

  if (!targetUser) {
    throw new Error("User not found");
  }

  if (
    !canAssignUserDepartment(
      actor.role,
      actor.department,
      targetUser.role,
    )
  ) {
    throw new Error("You cannot modify this user's department.");
  }

  await prisma.user.update({
    where: { id: parsedUserId.data },
    data: { department: parsedDepartment.data },
  });

  revalidatePath("/dashboard/users");
  return {
    success: true,
  };
}

export async function assignUserWorkMode(
  userId: string,
  workMode: WorkMode
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new Error("Unauthorized");
  }

  const actorRole = session.user.role as UserRole;
  if (actorRole !== UserRole.SUPER_ADMIN && actorRole !== UserRole.ADMIN) {
    throw new Error("Only admins can assign user work mode.");
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
    },
  });

  if (!targetUser) {
    throw new Error("User not found");
  }

  const targetRole = targetUser.role;

  // Cannot modify user with same or higher role
  if (roleLevel[actorRole] <= roleLevel[targetRole]) {
    throw new Error("You cannot modify this user's work mode");
  }

  await prisma.user.update({
    where: { id: userId },
    data: { workMode },
  });

  return {
    success: true,
  };
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
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new Error("Unauthorized");
  }

  const actorRole = session.user.role as UserRole;
  if (actorRole !== UserRole.SUPER_ADMIN && actorRole !== UserRole.ADMIN) {
    throw new Error("Only admins can update user payroll details.");
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
    },
  });

  if (!targetUser) {
    throw new Error("User not found");
  }

  const targetRole = targetUser.role;
  console.log("Actor Role:", actorRole, "Target Role:", targetRole, "Role Levels:", roleLevel[actorRole], roleLevel[targetRole]);
  // Cannot modify user with same or higher role
  if (actorRole !== "SUPER_ADMIN" && roleLevel[actorRole] <= roleLevel[targetRole]) {
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
    !canManageEmploymentStatus(actor.role, actor.department, target.role)
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
        role:
          actor.role === UserRole.SUPER_ADMIN
            ? { in: Object.values(UserRole) }
            : UserRole.STAFF,
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
  const target = await prisma.user.findUnique({
    where: { id: parsedUserId.data },
    select: { id: true, role: true },
  });
  if (
    !target ||
    actor.id === target.id ||
    !canManageEmploymentStatus(actor.role, actor.department, target.role)
  ) {
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
  const effectiveAt = parseEffectiveDate(parsedInput.data.effectiveDate);

  await prisma.$transaction(async (tx) => {
    const target = await tx.user.findUnique({
      where: { id: parsedInput.data.userId },
      select: { id: true, role: true, employmentStatus: true },
    });
    if (!target) {
      throw new Error("User not found.");
    }
    if (
      actor.id === target.id ||
      !canManageEmploymentStatus(actor.role, actor.department, target.role)
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
      if (
        !replacement ||
        replacement.id === target.id ||
        replacement.employmentStatus !== EmploymentStatus.ACTIVE ||
        replacement.banned === true ||
        (actor.role !== UserRole.SUPER_ADMIN &&
          replacement.role !== UserRole.STAFF)
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
  const effectiveAt = parseEffectiveDate(parsedInput.data.effectiveDate);

  await prisma.$transaction(async (tx) => {
    const target = await tx.user.findUnique({
      where: { id: parsedInput.data.userId },
      select: { id: true, role: true, employmentStatus: true },
    });
    if (!target) {
      throw new Error("User not found.");
    }
    if (
      actor.id === target.id ||
      !canManageEmploymentStatus(actor.role, actor.department, target.role)
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