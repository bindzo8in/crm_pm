import { Department, UserRole } from "@/app/generated/prisma/enums";
import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements, adminAc } from "better-auth/plugins/admin/access";
import type { Prisma } from "@/app/generated/prisma/client";

export const crmStatement = {
    dashboard: ["read"],

    users: [
        "create",
        "read",
        "update",
        "delete",
        "assign-role",
        "assign-department",
    ],

    customers: [
        "create",
        "read",
        "read-own",
        "update",
        "delete",
    ],

    proposals: [
        "create",
        "read",
        "read-own",
        "update",
        "update-own",
        "delete",
        "delete-own",
        "send",
        "send-own",
        "accept",
        "accept-own",
    ],

    invoices: [
        "create",
        "read",
        "read-own",
        "update",
        "update-own",
        "delete",
        "delete-own",
        "send",
        "send-own",
        "record-payment",
        "record-payment-own",
        "mark-paid",
        "mark-paid-own",
    ],

    services: [
        "create",
        "read",
        "update",
        "delete",
    ],

    products: [
        "create",
        "read",
        "update",
        "delete",
    ],

    terms: [
        "create",
        "read",
        "update",
        "delete",
    ],

    projects: [
        "create",
        "read-all",
        "read-assigned",
        "read-own",
        "update",
        "update-own",
        "update-status",
        "manage-team",
        "view-budget",
        "archive",
        "delete-own",
    ],

    tasks: [
        "create",
        "read-all",
        "read-assigned",
        "read-own",
        "update",
        "delete",
        "delete-own",
        "assign",
        "update-own",
    ],

    reports: [
        "read",
    ],

    finance: [
        "read",
        "create",
        "update",
        "delete",
    ],

    settings: [
        "read",
        "update",
    ],

    account: [
        "read",
        "update"
    ],

    attendance: [
        "clock-in",
        "clock-out",
        "read-own",
        "read-all",
        "manage",
        "view-analytics",
        "regularize",
        "approve-regularization",
        "view-audit-logs"
    ],

    leave: [
        "create",
        "read-own",
        "cancel-own",
        "read-all",
        "review",
    ],

    issueReports: [
        "create",
        "read-own",
        "read-all",
        "update",
    ],

    holidays: [
        "read",
        "create",
        "update",
        "delete",
    ],

    salary: [
        "read-own",
        "read-all",
        "create",
        "update",
        "mark-paid",
    ],

    tariffs: [
        "create",
        "read",
        "update",
        "delete",
    ],

    company: [
        "read",
        "update",
    ],

    bankAccounts: [
        "read",
        "create",
        "update",
        "delete",
    ],

    referenceData: [
        "read",
        "manage",
    ],
} as const;

export const statement = {
    ...defaultStatements,
    ...crmStatement,
} as const;

export const roleLevel: Readonly<Record<string, number>> = {
    owner: 3,
    admin: 2,
    member: 1,
    [UserRole.SUPER_ADMIN]: 3,
    [UserRole.ADMIN]: 2,
    [UserRole.STAFF]: 1,
};

export const ac = createAccessControl(statement);

export const userRole = ac.newRole({});

export const superAdminRole = ac.newRole({
    ...adminAc.statements,
    dashboard: ["read"],

    users: ["create", "read", "update", "delete", "assign-role", "assign-department"],

    customers: ["create", "read", "update", "delete"],

    proposals: ["create", "read", "update", "delete", "send", "accept"],

    invoices: ["create", "read", "update", "delete", "send", "record-payment", "mark-paid"],

    services: ["create", "read", "update", "delete"],
    products: ["create", "read", "update", "delete"],

    terms: ["create", "read", "update", "delete"],

    projects: ["create", "read-all", "read-assigned", "update", "update-status", "manage-team", "view-budget", "archive"],
    tasks: ["create", "read-all", "read-assigned", "update", "delete", "assign", "update-own"],

    reports: ["read"],

    finance: ["read", "create", "update", "delete"],

    settings: ["read", "update"],

    account: ["read", "update"],

    attendance: ["clock-in", "clock-out", "read-own", "read-all", "manage", "view-analytics", "regularize", "approve-regularization", "view-audit-logs"],

    leave: ["create", "read-own", "cancel-own", "read-all", "review"],
    issueReports: ["create", "read-own", "read-all", "update"],
    holidays: ["read", "create", "update", "delete"],

    salary: ["read-own", "read-all", "create", "update", "mark-paid"],

    tariffs: ["create", "read", "update", "delete"],

    company: ["read", "update"],

    bankAccounts: ["read", "create", "update", "delete"],

    referenceData: ["read"],
});

export const adminRole = ac.newRole({
    ...adminAc.statements,
    dashboard: ["read"],

    customers: ["create", "read", "update", "delete"],

    proposals: ["create", "read", "update", "delete", "send", "accept"],

    invoices: ["create", "read", "update", "delete", "send", "record-payment", "mark-paid"],

    services: ["create", "read", "update", "delete"],
    products: ["create", "read", "update", "delete"],

    terms: ["create", "read", "update", "delete"],

    projects: ["create", "read-all", "read-assigned", "update", "update-status", "manage-team", "view-budget", "archive"],
    tasks: ["create", "read-all", "read-assigned", "update", "delete", "assign", "update-own"],

    reports: ["read"],

    finance: ["read", "create", "update", "delete"],

    users: ["read", "update", "assign-department"],

    leave: ["create", "read-own", "cancel-own", "read-all", "review"],
    issueReports: ["create", "read-own", "read-all", "update"],
    holidays: ["read", "create", "update", "delete"],

    salary: ["read-own", "read-all", "create", "update", "mark-paid"],

    tariffs: ["create", "read", "update", "delete"],

    referenceData: ["read"],

    account: ["read", "update"],

    attendance: ["clock-in", "clock-out", "read-own", "read-all", "manage", "view-analytics", "regularize", "approve-regularization", "view-audit-logs"]
});

export const staffRole = ac.newRole({
    customers: ["create", "read", "update"],

    proposals: ["create", "read", "update"],

    invoices: ["create", "read", "update", "send", "record-payment", "mark-paid"],

    services: ["read"],
    products: ["read"],

    projects: ["read-assigned", "update-status"],
    tasks: ["read-assigned", "update-own"],

    account: ["read", "update"],

    attendance: ["clock-in", "clock-out", "read-own", "view-analytics", "regularize", "view-audit-logs"],

    leave: ["create", "read-own", "cancel-own"],
    issueReports: ["create", "read-own"],
    holidays: ["read"],

    salary: ["read-own"],

    referenceData: ["read"],
});

export const prismaModelPermissions = {
    User: "users",
    Session: "session",
    Account: "user",
    Verification: "user",
    Organization: "settings",
    Member: "users",
    OrganizationEmployeeProfile: "users",
    ImportedSourceRecord: "company",
    Invitation: "users",
    OrganizationRole: "users",
    Team: "users",
    TeamMember: "users",
    Customer: "customers",
    CustomerContact: "customers",
    Service: "services",
    Product: "products",
    ServicePackage: "services",
    ServicePackageItem: "services",
    PackageFeature: "services",
    ProposalTerm: "terms",
    ProposalTermPackage: "terms",
    ProposalTemplate: "proposals",
    Proposal: "proposals",
    ProposalBlock: "proposals",
    ProposalService: "proposals",
    ProposalLineItem: "proposals",
    ProposalFeature: "proposals",
    ProposalActivity: "proposals",
    Company: "company",
    CompanyBankAccount: "bankAccounts",
    TariffGrid: "tariffs",
    TariffGridPackage: "tariffs",
    Invoice: "invoices",
    InvoiceLineItem: "invoices",
    FinancialAccount: "finance",
    ExpenseCategory: "finance",
    Expense: "finance",
    InvoicePayment: "invoices",
    InvoiceActivity: "invoices",
    IssueReport: "issueReports",
    ExchangeRateCache: "referenceData",
    Country: "referenceData",
    State: "referenceData",
    AttendanceRecord: "attendance",
    AttendanceBreak: "attendance",
    WebPushSubscription: "attendance",
    AttendanceReminder: "attendance",
    AttendanceAlarm: "attendance",
    LeaveRequest: "leave",
    Holiday: "holidays",
    Notification: "holidays",
    MeasurementUnit: "referenceData",
    AttendanceSettings: "attendance",
    AttendanceAuditLog: "attendance",
    SalaryStructure: "salary",
    SalarySlip: "salary",
    SalarySlipAdjustment: "salary",
    SalaryPin: "salary",
    SalaryPinResetToken: "salary",
    Project: "projects",
    ProjectMember: "projects",
    ProjectTaskFolder: "projects",
    ProjectActivity: "projects",
    ProjectTask: "tasks",
    ProjectTaskDependency: "tasks",
    ProjectTaskChecklistItem: "tasks",
    ProjectTaskAttachment: "tasks",
    ProjectTaskComment: "tasks",
    ProjectTaskTimeEntry: "tasks",
    ProjectTaskStatusTemplate: "projects",
    EmployeeStatusHistory: "users",
    ExpenseHistory: "finance",
    Conversation: "projects",
    ConversationMember: "projects",
    ChatMessage: "projects",
    ChatMessageReaction: "projects",
    ChatMessageAttachment: "projects",
} satisfies Record<Prisma.ModelName, keyof typeof statement>;

export function canReadFinance(role: string): boolean {
    switch (role) {
        case "owner":
        case "admin":
        case UserRole.SUPER_ADMIN:
            return superAdminRole.statements.finance?.includes("read") ?? false;
        case UserRole.ADMIN:
            return adminRole.statements.finance?.includes("read") ?? false;
        case UserRole.STAFF:
            return false;
        default:
            return false;
    }
}

export function canReadDashboard(role: string): boolean {
    switch (role) {
        case "owner":
        case "admin":
        case UserRole.SUPER_ADMIN:
            return superAdminRole.statements.dashboard?.includes("read") ?? false;
        case UserRole.ADMIN:
            return adminRole.statements.dashboard?.includes("read") ?? false;
        case UserRole.STAFF:
            return false;
        default:
            return false;
    }
}

export function canManageIssueReports(
    user: { role: string; department: Department | null },
): boolean {
    return (
        user.role === "owner" ||
        user.role === "admin" ||
        user.role === UserRole.SUPER_ADMIN ||
        user.role === UserRole.ADMIN ||
        ((user.role === UserRole.STAFF || user.role === "member") &&
            user.department === Department.HR)
    );
}

export function canManageUser(
    actorRole: string,
    targetRole: string
) {
    return (
        Object.hasOwn(roleLevel, actorRole) &&
        Object.hasOwn(roleLevel, targetRole) &&
        roleLevel[actorRole] > roleLevel[targetRole]
    );
}

export function canManageUserDirectory(
    actorRole: string,
    actorDepartment?: string | null,
): boolean {
    return (
        actorRole === "owner" ||
        actorRole === "admin" ||
        actorRole === UserRole.SUPER_ADMIN ||
        actorRole === UserRole.ADMIN ||
        ((actorRole === UserRole.STAFF || actorRole === "member") &&
            actorDepartment === Department.HR)
    );
}

export function canAssignUserDepartment(
    actorRole: string,
    actorDepartment: string | null | undefined,
    targetRole: string,
): boolean {
    if (!canManageUserDirectory(actorRole, actorDepartment)) {
        return false;
    }

    return actorRole === UserRole.STAFF || actorRole === "member"
        ? targetRole === UserRole.STAFF || targetRole === "member"
        : canManageUser(actorRole, targetRole);
}

export function canManageEmploymentStatus(
    actorRole: string,
    actorDepartment: string | null | undefined,
    targetRole: string,
): boolean {
    if (!canManageUserDirectory(actorRole, actorDepartment)) {
        return false;
    }

    return actorRole === UserRole.STAFF || actorRole === "member"
        ? targetRole === UserRole.STAFF || targetRole === "member"
        : canManageUser(actorRole, targetRole);
}

export function canManageAttendanceReportInclusion(
    actorRole: string,
    actorDepartment: string | null | undefined,
    targetRole: string,
): boolean {
    if (!canManageUserDirectory(actorRole, actorDepartment)) {
        return false;
    }

    return (
        actorRole === UserRole.SUPER_ADMIN ||
        actorRole === "owner" ||
        canManageEmploymentStatus(actorRole, actorDepartment, targetRole)
    );
}