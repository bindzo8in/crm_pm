import { UserRole } from "@/app/generated/prisma/enums";
import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements, adminAc } from "better-auth/plugins/admin/access";

const statement = {
    ...defaultStatements,

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
        "read",
        "update",
        "delete",
    ],

    tasks: [
        "create",
        "read",
        "update",
        "delete",
        "assign",
    ],

    reports: [
        "read",
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
    ]
} as const;

export const roleLevel: Record<UserRole, number> = {
    [UserRole.SUPER_ADMIN]: 3,
    [UserRole.ADMIN]: 2,
    [UserRole.STAFF]: 1,
};

export const ac = createAccessControl(statement);

export const superAdminRole = ac.newRole({
    ...adminAc.statements,

    users: ["create", "read", "update", "delete", "assign-role", "assign-department"],

    customers: ["create", "read", "update", "delete"],

    proposals: ["create", "read", "update", "delete", "send", "accept"],

    invoices: ["create", "read", "update", "delete", "send", "record-payment", "mark-paid"],

    services: ["create", "read", "update", "delete"],

    terms: ["create", "read", "update", "delete"],

    projects: ["create", "read", "update", "delete"],

    tasks: ["create", "read", "update", "delete", "assign"],

    reports: ["read"],

    settings: ["read", "update"],

    account: ["read", "update"],

    attendance: ["clock-in", "clock-out", "read-own", "read-all", "manage", "view-analytics", "regularize", "approve-regularization", "view-audit-logs"]
});

export const adminRole = ac.newRole({
    ...adminAc.statements,

    customers: ["create", "read", "update", "delete"],

    proposals: ["create", "read", "update", "delete", "send", "accept"],

    invoices: ["create", "read", "update", "delete", "send", "record-payment", "mark-paid"],

    services: ["create", "read", "update", "delete"],

    terms: ["create", "read", "update", "delete"],

    projects: ["create", "read", "update", "delete"],

    tasks: ["create", "read", "update", "delete", "assign"],

    reports: ["read"],

    users: ["read", "update", "assign-department"],

    account: ["read", "update"],

    attendance: ["clock-in", "clock-out", "read-own", "read-all", "manage", "view-analytics", "regularize", "approve-regularization", "view-audit-logs"]
});

export const staffRole = ac.newRole({
    customers: ["create", "read", "update"],

    proposals: ["create", "read", "update"],

    invoices: ["create", "read", "update", "send", "record-payment", "mark-paid"],

    projects: ["read", "update"],

    tasks: ["read", "update"],

    account: ["read", "update"],

    attendance: ["clock-in", "clock-out", "read-own", "view-analytics", "regularize"]
});

export function canManageUser(
    actorRole: UserRole,
    targetRole: UserRole
) {
    return roleLevel[actorRole] > roleLevel[targetRole];
}