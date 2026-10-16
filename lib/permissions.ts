import { UserRole } from "@/app/generated/prisma/enums";
import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements, adminAc } from "better-auth/plugins/admin/access";
import type { Prisma } from "@/app/generated/prisma/client";

export const statement = {
    ...defaultStatements,

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
        "update",
        "delete",
    ],

    proposals: [
        "create",
        "read",
        "update",
        "delete",
        "send",
        "accept",
    ],

    invoices: [
        "create",
        "read",
        "update",
        "delete",
        "send",
        "record-payment",
        "mark-paid",
    ],

    services: [
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
        "update",
        "update-status",
        "manage-team",
        "view-budget",
        "archive",
    ],

    tasks: [
        "create",
        "read-all",
        "read-assigned",
        "update",
        "delete",
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
    ],
} as const;

export const roleLevel: Record<UserRole, number> = {
    [UserRole.SUPER_ADMIN]: 3,
    [UserRole.ADMIN]: 2,
    [UserRole.STAFF]: 1,
};

export const ac = createAccessControl(statement);

export const superAdminRole = ac.newRole({
    ...adminAc.statements,
    dashboard: ["read"],

    users: ["create", "read", "update", "delete", "assign-role", "assign-department"],

    customers: ["create", "read", "update", "delete"],

    proposals: ["create", "read", "update", "delete", "send", "accept"],

    invoices: ["create", "read", "update", "delete", "send", "record-payment", "mark-paid"],

    services: ["create", "read", "update", "delete"],

    terms: ["create", "read", "update", "delete"],

    projects: ["create", "read-all", "read-assigned", "update", "update-status", "manage-team", "view-budget", "archive"],
    tasks: ["create", "read-all", "read-assigned", "update", "delete", "assign", "update-own"],

    reports: ["read"],

    finance: ["read", "create", "update", "delete"],

    settings: ["read", "update"],

    account: ["read", "update"],

    attendance: ["clock-in", "clock-out", "read-own", "read-all", "manage", "view-analytics", "regularize", "approve-regularization", "view-audit-logs"],

    leave: ["create", "read-own", "cancel-own", "read-all", "review"],

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

    terms: ["create", "read", "update", "delete"],

    projects: ["create", "read-all", "read-assigned", "update", "update-status", "manage-team", "view-budget", "archive"],
    tasks: ["create", "read-all", "read-assigned", "update", "delete", "assign", "update-own"],

    reports: ["read"],

    finance: ["read", "create", "update", "delete"],

    users: ["read", "update", "assign-department"],

    leave: ["create", "read-own", "cancel-own", "read-all", "review"],

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

    projects: ["read-assigned", "update-status"],
    tasks: ["read-assigned", "update-own"],

    account: ["read", "update"],

    attendance: ["clock-in", "clock-out", "read-own", "view-analytics", "regularize", "view-audit-logs"],

    leave: ["create", "read-own", "cancel-own"],

    holidays: ["read"],

    referenceData: ["read"],
});

export const prismaModelPermissions = {
    User: "users",
    Session: "session",
    Account: "user",
    Verification: "user",
    Customer: "customers",
    CustomerContact: "customers",
    Service: "services",
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
    ExchangeRateCache: "referenceData",
    Country: "referenceData",
    State: "referenceData",
    AttendanceRecord: "attendance",
    AttendanceBreak: "attendance",
    LeaveRequest: "leave",
    Holiday: "holidays",
    AttendanceSettings: "attendance",
    AttendanceAuditLog: "attendance",
    SalaryStructure: "salary",
    SalarySlip: "salary",
    Project: "projects",
    ProjectMember: "projects",
    ProjectActivity: "projects",
    ProjectTask: "tasks",
} satisfies Record<Prisma.ModelName, keyof typeof statement>;

export function canReadFinance(role: UserRole): boolean {
    switch (role) {
        case UserRole.SUPER_ADMIN:
            return superAdminRole.statements.finance?.includes("read") ?? false;
        case UserRole.ADMIN:
            return adminRole.statements.finance?.includes("read") ?? false;
        case UserRole.STAFF:
            return false;
    }
}

export function canReadDashboard(role: UserRole): boolean {
    switch (role) {
        case UserRole.SUPER_ADMIN:
            return superAdminRole.statements.dashboard?.includes("read") ?? false;
        case UserRole.ADMIN:
            return adminRole.statements.dashboard?.includes("read") ?? false;
        case UserRole.STAFF:
            return false;
    }
}

export function canManageUser(
    actorRole: UserRole,
    targetRole: UserRole
) {
    return roleLevel[actorRole] > roleLevel[targetRole];
}