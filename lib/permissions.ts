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
        "mark-paid",
    ],

    services: [
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
} as const;

export const roleLevel: Record<UserRole, number> = {
    [UserRole.SUPER_ADMIN]: 3,
    [UserRole.ADMIN]: 2,
    [UserRole.STAFF]: 1,
};

export const ac = createAccessControl(statement);

export const superAdminRole = ac.newRole({
    ...adminAc.statements,

    users: ["create", "read", "update", "delete", "assign-role"],

    customers: ["create", "read", "update", "delete"],

    proposals: ["create", "read", "update", "delete", "send", "accept"],

    invoices: ["create", "read", "update", "delete", "mark-paid"],

    services: ["create", "read", "update", "delete"],

    projects: ["create", "read", "update", "delete"],

    tasks: ["create", "read", "update", "delete", "assign"],

    reports: ["read"],

    settings: ["read", "update"],
});

export const adminRole = ac.newRole({
    customers: ["create", "read", "update", "delete"],

    proposals: ["create", "read", "update", "delete", "send", "accept"],

    invoices: ["create", "read", "update", "delete", "mark-paid"],

    services: ["create", "read", "update", "delete"],

    projects: ["create", "read", "update", "delete"],

    tasks: ["create", "read", "update", "delete", "assign"],

    reports: ["read"],

    users: ["read"],
});

export const staffRole = ac.newRole({
    customers: ["create", "read", "update"],

    proposals: ["create", "read", "update"],

    invoices: ["create", "read", "update"],

    projects: ["read", "update"],

    tasks: ["read", "update"],
});

export function canManageUser(
    actorRole: UserRole,
    targetRole: UserRole
) {
    return roleLevel[actorRole] > roleLevel[targetRole];
}