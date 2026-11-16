import { createAccessControl } from "better-auth/plugins/access";
import {
  adminAc as organizationAdminPermissions,
  defaultStatements as organizationDefaultStatements,
  memberAc as organizationMemberPermissions,
  ownerAc as organizationOwnerPermissions,
} from "better-auth/plugins/organization/access";
import { crmStatement } from "@/lib/permissions";

const organizationUserPermissions: readonly string[] = crmStatement.users.filter(
  (permission) => permission !== "assign-department",
);

export const organizationStatement = {
  ...organizationDefaultStatements,
  ...crmStatement,
} as const;

export const organizationCustomRoleStatement = {
  ...crmStatement,
  users: organizationUserPermissions,
} as const;

export const organizationAc = createAccessControl(organizationStatement);

const organizationMemberAccess = {
  account: ["read", "update"],
  projects: ["read-assigned"],
  tasks: ["read-assigned", "update-own"],
  attendance: ["clock-in", "clock-out", "read-own", "regularize"],
  leave: ["create", "read-own", "cancel-own"],
  issueReports: ["create", "read-own"],
  holidays: ["read"],
  salary: ["read-own"],
  referenceData: ["read"],
} as const;

export const organizationOwnerRole = organizationAc.newRole({
  ...organizationOwnerPermissions.statements,
  ...crmStatement,
});

export const organizationAdminRole = organizationAc.newRole({
  ...organizationAdminPermissions.statements,
  ...crmStatement,
});

export const organizationMemberRole = organizationAc.newRole({
  ...organizationMemberPermissions.statements,
  ...organizationMemberAccess,
});

export const organizationRoles = {
  owner: organizationOwnerRole,
  admin: organizationAdminRole,
  member: organizationMemberRole,
};
