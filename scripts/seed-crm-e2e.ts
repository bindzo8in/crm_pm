import { randomUUID } from "node:crypto";
import dotenv from "dotenv";
import type { Department as DepartmentValue } from "../app/generated/prisma/enums";
import {
  attendanceE2EEmail,
  getAttendanceE2EOfficeLocation,
  attendanceE2ERoster,
} from "../tests/playwright/support/attendance-month-fixture";

dotenv.config({ path: ".env", quiet: true });
dotenv.config({ path: ".env.test", override: true, quiet: true });

const expectedDatabase = process.env.CRM_E2E_CONFIRM_DATABASE?.trim();
const password =
  process.env.CRM_E2E_PASSWORD ?? process.env.ATTENDANCE_E2E_PASSWORD;

function assertSafeDatabaseTarget(): void {
  if (
    expectedDatabase !== "crm-test-xxxyyyzzz" &&
    expectedDatabase !== "crm_attendance_e2e"
  ) {
    throw new Error(
      "Set CRM_E2E_CONFIRM_DATABASE to crm-test-xxxyyyzzz or crm_attendance_e2e to seed an isolated local E2E database.",
    );
  }

  const targets = ["DATABASE_URL", "DIRECT_URL"].map((key) => {
    const value = process.env[key];
    if (!value) {
      throw new Error(`${key} must point to local ${expectedDatabase}.`);
    }

    let url: URL;
    try {
      url = new URL(value);
    } catch {
      throw new Error(`${key} must be a valid PostgreSQL URL.`);
    }

    const isLoopback = ["localhost", "127.0.0.1", "::1"].includes(
      url.hostname,
    );
    if (!["postgres:", "postgresql:"].includes(url.protocol)) {
      throw new Error(`${key} must use PostgreSQL.`);
    }
    const databaseName = decodeURIComponent(url.pathname.slice(1));
    if (!isLoopback || databaseName !== expectedDatabase) {
      throw new Error(
        `Refusing to seed: ${key} must point to local ${expectedDatabase}.`,
      );
    }

    return `${url.hostname}:${url.port || "5432"}/${databaseName}`;
  });

  if (targets[0] !== targets[1]) {
    throw new Error("DATABASE_URL and DIRECT_URL must target the same database.");
  }

  if (!password || password.length < 12) {
    throw new Error(
      "Set CRM_E2E_PASSWORD to a test-only password of at least 12 characters.",
    );
  }
}

type TestPersona = {
  key: string;
  name: string;
  role: string;
  globalRole: string;
  id?: string;
  department?: DepartmentValue;
};

async function main(): Promise<void> {
  assertSafeDatabaseTarget();
  const officeLocation = getAttendanceE2EOfficeLocation();

  const [
    { default: prisma },
    { auth },
    { GlobalRole },
    { Department, EmploymentStatus, WorkMode },
    { organizationRoleTemplates },
  ] = await Promise.all([
    import("../lib/prisma"),
    import("../lib/auth"),
    import("../lib/global-role"),
    import("../app/generated/prisma/enums"),
    import("../lib/organization-role-templates"),
  ]);
  const authContext = await auth.$context;

  const personas: TestPersona[] = [
    {
      key: "platform-super-admin",
      id: "Q1sLV6ikT4fOYOCnw4b8mF2YGV0JR2WY",
      name: "CRM E2E Platform Super Admin",
      role: "member",
      globalRole: GlobalRole.SUPER_ADMIN,
    },
    {
      key: "workspace-owner",
      name: "CRM E2E Workspace Owner",
      role: "owner",
      globalRole: GlobalRole.USER,
    },
    {
      key: "workspace-admin",
      name: "CRM E2E Workspace Admin",
      role: "admin",
      globalRole: GlobalRole.USER,
    },
    {
      key: "hr",
      name: "CRM E2E HR",
      role: "hr",
      globalRole: GlobalRole.USER,
      department: Department.HR,
    },
    {
      key: "finance",
      name: "CRM E2E Finance",
      role: "finance",
      globalRole: GlobalRole.USER,
    },
    {
      key: "sales-executive",
      name: "CRM E2E Sales Executive",
      role: "sales-executive",
      globalRole: GlobalRole.USER,
      department: Department.SALES,
    },
    {
      key: "member",
      name: "CRM E2E Member",
      role: "member",
      globalRole: GlobalRole.USER,
      department: Department.DEVELOPMENT,
    },
  ];

  async function ensureUser(persona: TestPersona): Promise<string> {
    const email = `crm-e2e-${persona.key}@example.invalid`;
    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (persona.id) {
      const reservedIdUser = await prisma.user.findUnique({
        where: { id: persona.id },
        select: { email: true },
      });
      if (reservedIdUser && reservedIdUser.email !== email) {
        throw new Error(
          `The reserved ID for ${persona.key} belongs to another account; refusing to modify it.`,
        );
      }
    }
    const userId = existing?.id ?? persona.id ?? randomUUID();

    if (existing && persona.id && existing.id !== persona.id) {
      throw new Error(`The seeded ${persona.key} email has an unexpected user ID.`);
    }

    const user = await prisma.user.upsert({
      where: { id: userId },
      create: {
        id: userId,
        name: persona.name,
        email,
        emailVerified: true,
        role: persona.globalRole,
        employmentStatus: EmploymentStatus.ACTIVE,
        includeInAttendanceReports: true,
        workMode: WorkMode.OFFICE,
        ...(persona.department
          ? { department: persona.department }
          : {}),
      },
      update: {
        name: persona.name,
        email,
        emailVerified: true,
        role: persona.globalRole,
        employmentStatus: EmploymentStatus.ACTIVE,
        includeInAttendanceReports: true,
        workMode: WorkMode.OFFICE,
        department: persona.department ?? null,
      },
      select: { id: true },
    });

    const credential = await prisma.account.findFirst({
      where: { userId: user.id, providerId: "credential" },
      select: { id: true },
    });
    const passwordHash = await authContext.password.hash(password ?? "");
    if (credential) {
      await prisma.account.update({
        where: { id: credential.id },
        data: { accountId: user.id, password: passwordHash },
      });
    } else {
      await prisma.account.create({
        data: {
          id: randomUUID(),
          accountId: user.id,
          providerId: "credential",
          userId: user.id,
          password: passwordHash,
        },
      });
    }

    const verifiedCredential = await prisma.account.findFirst({
      where: { userId: user.id, providerId: "credential" },
      select: { password: true },
    });
    if (
      !verifiedCredential?.password ||
      !(await authContext.password.verify({
        password: password ?? "",
        hash: verifiedCredential.password,
      }))
    ) {
      throw new Error(`Could not verify the test password for ${persona.key}.`);
    }

    return user.id;
  }

  try {
    const existingUsers = await prisma.user.count();
    if (existingUsers > 0) {
      const expectedEmails = personas.map(
        ({ key }) => `crm-e2e-${key}@example.invalid`,
      );
      if (expectedDatabase === "crm_attendance_e2e") {
        expectedEmails.push(...attendanceE2ERoster.map(attendanceE2EEmail));
      }
      const unexpectedUsers = await prisma.user.count({
        where: { email: { notIn: expectedEmails } },
      });
      const preservedUserLimit =
        expectedDatabase === "crm_attendance_e2e" ? 1 : 0;
      if (unexpectedUsers > preservedUserLimit) {
        throw new Error(
          `The target database contains ${unexpectedUsers} non-E2E users; the configured seed allows at most ${preservedUserLimit} preserved account(s).`,
        );
      }
    }

    const userIds = new Map<string, string>();
    for (const persona of personas) {
      userIds.set(persona.key, await ensureUser(persona));
    }

    const superAdminId = userIds.get("platform-super-admin");
    if (!superAdminId) throw new Error("The platform super admin was not created.");

    const slug = "crm-e2e-test";
    let organization = await prisma.organization.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!organization) {
      await auth.api.createOrganization({
        body: {
          name: "CRM E2E Workspace",
          slug,
          userId: superAdminId,
        },
      });
      organization = await prisma.organization.findUnique({
        where: { slug },
        select: { id: true },
      });
    }
    if (!organization) {
      throw new Error("Better Auth did not create the CRM E2E organization.");
    }

    const ownerId = userIds.get("workspace-owner");
    if (!ownerId) throw new Error("The workspace owner was not created.");
    await prisma.member.upsert({
      where: {
        organizationId_userId: {
          organizationId: organization.id,
          userId: ownerId,
        },
      },
      create: {
        id: randomUUID(),
        organizationId: organization.id,
        userId: ownerId,
        role: "owner",
      },
      update: { role: "owner" },
    });

    await prisma.member.updateMany({
      where: {
        organizationId: organization.id,
        userId: superAdminId,
      },
      data: { role: "member" },
    });

    for (const template of organizationRoleTemplates) {
      const permission: Record<string, string[]> = {};
      for (const entry of template.permissions) {
        const separator = entry.indexOf(":");
        const resource = entry.slice(0, separator);
        const action = entry.slice(separator + 1);
        permission[resource] = [...(permission[resource] ?? []), action];
      }

      await prisma.organizationRole.upsert({
        where: {
          organizationId_role: {
            organizationId: organization.id,
            role: template.role,
          },
        },
        create: {
          id: randomUUID(),
          organizationId: organization.id,
          role: template.role,
          permission: JSON.stringify(permission),
        },
        update: { permission: JSON.stringify(permission) },
      });
    }

    for (const persona of personas) {
      const userId = userIds.get(persona.key);
      if (!userId) throw new Error(`Missing user for ${persona.key}.`);
      await prisma.member.upsert({
        where: {
          organizationId_userId: {
            organizationId: organization.id,
            userId,
          },
        },
        create: {
          id: randomUUID(),
          organizationId: organization.id,
          userId,
          role: persona.role,
        },
        update: { role: persona.role },
      });
    }

    if (expectedDatabase === "crm_attendance_e2e") {
      for (const persona of attendanceE2ERoster) {
        const user = await prisma.user.findUnique({
          where: { email: attendanceE2EEmail(persona) },
          select: { id: true },
        });
        if (!user) {
          throw new Error(
            `Missing attendance E2E user ${persona.key}; seed attendance fixtures first.`,
          );
        }

        const role =
          persona.key === "ceo"
            ? "owner"
            : persona.key === "admin"
              ? "admin"
              : persona.key === "hr"
                ? "hr"
                : persona.key === "sales"
                  ? "sales-executive"
                  : "member";
        await prisma.member.upsert({
          where: {
            organizationId_userId: {
              organizationId: organization.id,
              userId: user.id,
            },
          },
          create: {
            id: randomUUID(),
            organizationId: organization.id,
            userId: user.id,
            role,
          },
          update: { role },
        });
      }
    }

    const teamName = "CRM E2E Team";
    let team = await prisma.team.findFirst({
      where: { organizationId: organization.id, name: teamName },
      select: { id: true },
    });
    if (!team) {
      team = await prisma.team.create({
        data: {
          id: randomUUID(),
          name: teamName,
          organizationId: organization.id,
        },
        select: { id: true },
      });
    }
    for (const userId of userIds.values()) {
      await prisma.teamMember.upsert({
        where: { teamId_userId: { teamId: team.id, userId } },
        create: { id: randomUUID(), teamId: team.id, userId },
        update: {},
      });
    }

    const companyData = {
      displayName: "CRM E2E Demo",
      legalName: "CRM E2E Demo Private Limited",
      employeeIdPrefix: "E2E-",
      email: "office@crm-e2e.invalid",
      phone: "+91 9000000000",
      address: "1 Test Way",
      city: "Chennai",
      state: "Tamil Nadu",
      country: "India",
      postalCode: "600001",
    };
    const company = await prisma.company.upsert({
      where: { organizationId: organization.id },
      create: { organizationId: organization.id, ...companyData },
      update: companyData,
      select: { id: true },
    });

    const bankAccountName = "E2E Operating Account";
    let bankAccount = await prisma.companyBankAccount.findFirst({
      where: { companyId: company.id, accountName: bankAccountName },
      select: { id: true },
    });
    if (!bankAccount) {
      bankAccount = await prisma.companyBankAccount.create({
        data: {
          companyId: company.id,
          accountName: bankAccountName,
          bankName: "E2E Test Bank",
          accountNumber: "0000000000",
          ifscCode: "TEST0000001",
          isDefault: true,
          isActive: true,
        },
        select: { id: true },
      });
    }

    const openingBalanceDate = new Date();
    openingBalanceDate.setUTCHours(0, 0, 0, 0);
    await prisma.financialAccount.upsert({
      where: {
        companyId_name: { companyId: company.id, name: "Office Cash" },
      },
      create: {
        companyId: company.id,
        name: "Office Cash",
        type: "CASH",
        openingBalance: 0,
        openingBalanceDate,
      },
      update: {},
    });
    await prisma.financialAccount.upsert({
      where: { companyBankAccountId: bankAccount.id },
      create: {
        companyId: company.id,
        companyBankAccountId: bankAccount.id,
        name: `${companyData.displayName} ${bankAccountName}`,
        type: "BANK",
        openingBalance: 0,
        openingBalanceDate,
      },
      update: {},
    });

    await prisma.attendanceSettings.upsert({
      where: { organizationId: organization.id },
      create: {
        organizationId: organization.id,
        expectedClockIn: "09:00",
        expectedClockOut: "18:00",
        attendanceReminderTime: "08:30",
        gracePeriodMinutes: 15,
        halfDayThresholdMinutes: 240,
        maxShiftHoursCap: 16,
        allowOvernightShift: true,
        officeLatitude: officeLocation.latitude,
        officeLongitude: officeLocation.longitude,
        officeRadiusMeters: 500,
        enforceOfficeGeofence: true,
        weekendDays: [0],
        isConfigured: true,
      },
      update: {
        isConfigured: true,
        officeLatitude: officeLocation.latitude,
        officeLongitude: officeLocation.longitude,
        officeRadiusMeters: 500,
      },
    });

    console.log(
      `Seeded ${personas.length} CRM E2E users, ${organizationRoleTemplates.length} custom roles, one organization, one team, and test company settings in ${expectedDatabase}.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
