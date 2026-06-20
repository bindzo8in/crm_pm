import { UserRole } from "@/app/generated/prisma/enums";
import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements, adminAc } from "better-auth/plugins/admin/access";

const statement = {
    ...defaultStatements,

    roleManagement: [
        "create-admin",
        "create-sales",
        "edit-admin",
        "edit-sales"
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

    roleManagement: [
        "create-admin",
        "create-sales",
        "edit-admin",
        "edit-sales"
    ]
})
export const adminRole = ac.newRole({
    ...adminAc.statements,

    roleManagement: [
        "create-sales",
        "edit-sales"
    ]
});

export const staffRole = ac.newRole({})

export function canManageUser(
    actorRole: UserRole,
    targetRole: UserRole
) {
    return roleLevel[actorRole] > roleLevel[targetRole];
}