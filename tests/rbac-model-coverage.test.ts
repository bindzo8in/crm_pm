import assert from "node:assert/strict";
import test from "node:test";
import { UserRole } from "../app/generated/prisma/enums";
import {
  adminRole,
  canReadDashboard,
  prismaModelPermissions,
  staffRole,
  statement,
  superAdminRole,
} from "../lib/permissions";
import {
  canAccessRoute,
  getOrganizationRoutePermissions,
} from "../lib/route-permissions";
import {
  organizationAdminRole,
  organizationCustomRoleStatement,
  organizationMemberRole,
  organizationOwnerRole,
} from "../lib/organization-permissions";
import { organizationRoleTemplates } from "../lib/organization-role-templates";
import { hasBusinessWorkspaceAccess } from "../lib/workspace-access";
import { canAccessProjectChatWithPermissions } from "../lib/project-chat-policy";

test("every Prisma model maps to a declared RBAC resource", () => {
  for (const [model, resource] of Object.entries(prismaModelPermissions)) {
    assert.ok(resource in statement, `${model} maps to unknown resource ${resource}`);
  }
});

test("organization route permissions support tenant roles and nested routes", () => {
  assert.deepEqual(
    getOrganizationRoutePermissions("/dashboard/projects/project-id/edit"),
    [
      { resource: "projects", permission: "update" },
      { resource: "projects", permission: "update-own" },
    ],
  );
  assert.deepEqual(
    getOrganizationRoutePermissions("/dashboard/projects/project-id"),
    [
      { resource: "projects", permission: "read-all" },
      { resource: "projects", permission: "read-assigned" },
      { resource: "projects", permission: "read-own" },
    ],
  );
  assert.deepEqual(
    getOrganizationRoutePermissions("/dashboard/organizations"),
    null,
  );
});

test("organization custom roles do not expose legacy department assignment", () => {
  assert.equal(
    organizationCustomRoleStatement.users.includes("assign-department"),
    false,
  );
});

test("organization role templates contain only permissions available to custom roles", () => {
  const availablePermissions = new Set(
    Object.entries(organizationCustomRoleStatement).flatMap(([resource, actions]) =>
      actions.map((action) => `${resource}:${action}`),
    ),
  );
  assert.deepEqual(
    organizationRoleTemplates.map(({ id }) => id),
    ["hr", "finance", "sales-executive"],
  );
  for (const template of organizationRoleTemplates) {
    for (const permission of template.permissions) {
      assert.ok(
        availablePermissions.has(permission),
        `${template.id} template includes unavailable permission ${permission}`,
      );
    }
    if (template.id === "finance" || template.id === "sales-executive") {
      assert.ok(template.permissions.includes("attendance:clock-in"));
      assert.ok(template.permissions.includes("attendance:clock-out"));
      assert.ok(template.permissions.includes("attendance:read-own"));
    }
  }
});

test("built-in member role grants self-service and assigned work, not CRM admin access", () => {
  assert.equal("dashboard" in organizationMemberRole.statements, false);
  assert.equal("customers" in organizationMemberRole.statements, false);
  assert.equal("invoices" in organizationMemberRole.statements, false);
  assert.equal("proposals" in organizationMemberRole.statements, false);
  assert.deepEqual(organizationMemberRole.statements.attendance, [
    "clock-in",
    "clock-out",
    "read-own",
    "regularize",
  ]);
  assert.deepEqual(organizationMemberRole.statements.leave, [
    "create",
    "read-own",
    "cancel-own",
  ]);
  assert.deepEqual(organizationMemberRole.statements.salary, ["read-own"]);
  assert.deepEqual(organizationMemberRole.statements.tasks, [
    "read-assigned",
    "update-own",
  ]);
});

test("own-record permission can enter proposal, invoice, and task routes", () => {
  assert.deepEqual(
    getOrganizationRoutePermissions("/dashboard/proposals"),
    [
      { resource: "proposals", permission: "read" },
      { resource: "proposals", permission: "read-own" },
    ],
  );
  assert.deepEqual(
    getOrganizationRoutePermissions("/dashboard/invoices"),
    [
      { resource: "invoices", permission: "read" },
      { resource: "invoices", permission: "read-own" },
    ],
  );
  assert.deepEqual(
    getOrganizationRoutePermissions("/dashboard/tasks"),
    [
      { resource: "tasks", permission: "read-all" },
      { resource: "tasks", permission: "read-assigned" },
      { resource: "tasks", permission: "read-own" },
    ],
  );
});

test("page routes require action permissions for create and edit screens", () => {
  assert.deepEqual(
    getOrganizationRoutePermissions("/dashboard/customers/create"),
    [{ resource: "customers", permission: "create" }],
  );
  assert.deepEqual(
    getOrganizationRoutePermissions("/dashboard/proposals/proposal-id/edit"),
    [
      { resource: "proposals", permission: "update" },
      { resource: "proposals", permission: "update-own" },
    ],
  );
  assert.deepEqual(
    getOrganizationRoutePermissions("/dashboard/invoices/invoice-id/edit"),
    [
      { resource: "invoices", permission: "update" },
      { resource: "invoices", permission: "update-own" },
    ],
  );
  assert.deepEqual(
    getOrganizationRoutePermissions("/dashboard/projects/project-id/team"),
    [{ resource: "projects", permission: "manage-team" }],
  );
  assert.deepEqual(
    getOrganizationRoutePermissions("/dashboard/settings/business/banks"),
    [{ resource: "bankAccounts", permission: "read" }],
  );
  assert.deepEqual(
    getOrganizationRoutePermissions("/dashboard/tariffs/create"),
    [{ resource: "tariffs", permission: "create" }],
  );
});

test("project chat access requires organization permission and project scope", () => {
  assert.equal(
    canAccessProjectChatWithPermissions({
      canReadAll: false,
      canReadAssigned: true,
      canReadOwn: false,
      isAssigned: true,
      isOwner: false,
    }),
    true,
  );
  assert.equal(
    canAccessProjectChatWithPermissions({
      canReadAll: false,
      canReadAssigned: true,
      canReadOwn: false,
      isAssigned: false,
      isOwner: false,
    }),
    false,
  );
  assert.equal(
    canAccessProjectChatWithPermissions({
      canReadAll: false,
      canReadAssigned: false,
      canReadOwn: true,
      isAssigned: false,
      isOwner: true,
    }),
    true,
  );
  assert.equal(
    canAccessProjectChatWithPermissions({
      canReadAll: true,
      canReadAssigned: false,
      canReadOwn: false,
      isAssigned: false,
      isOwner: false,
    }),
    true,
  );
});

test("dashboard selection uses organization roles instead of global user roles", () => {
  assert.equal(canReadDashboard("owner"), true);
  assert.equal(canReadDashboard("admin"), true);
  assert.equal(canReadDashboard("member"), false);
  assert.equal(canReadDashboard("USER"), false);
  assert.equal(canReadDashboard(UserRole.SUPER_ADMIN), false);
});

test("platform administrators are excluded from organization workspace routes", () => {
  for (const path of [
    "/dashboard",
    "/dashboard/organization-management",
    "/dashboard/attendance",
    "/dashboard/services/packages",
    "/dashboard/users",
    "/dashboard/issues",
    "/dashboard/unlisted-module",
  ]) {
    assert.equal(canAccessRoute(path, UserRole.SUPER_ADMIN), false, path);
  }
});

test("staff model permissions remain limited to self-service and read-only data", () => {
  assert.deepEqual(staffRole.statements.leave, ["create", "read-own", "cancel-own"]);
  assert.deepEqual(staffRole.statements.holidays, ["read"]);
  assert.deepEqual(staffRole.statements.referenceData, ["read"]);
  assert.deepEqual(staffRole.statements.attendance, [
    "clock-in",
    "clock-out",
    "read-own",
    "view-analytics",
    "regularize",
    "view-audit-logs",
  ]);
  assert.equal("tariffs" in staffRole.statements, false);
  assert.deepEqual(staffRole.statements.salary, ["read-own"]);
  assert.equal("company" in staffRole.statements, false);
  assert.equal("bankAccounts" in staffRole.statements, false);
  assert.deepEqual(staffRole.statements.projects, ["read-assigned", "update-status"]);
  assert.deepEqual(staffRole.statements.tasks, ["read-assigned", "update-own"]);
});

test("measurement unit management is limited to organization administrators", () => {
  assert.deepEqual(organizationOwnerRole.statements.referenceData, ["read", "manage"]);
  assert.deepEqual(organizationAdminRole.statements.referenceData, ["read", "manage"]);
  assert.deepEqual(organizationMemberRole.statements.referenceData, ["read"]);
});

test("project management stays scoped between staff and administrators", () => {
  assert.ok(adminRole.statements.projects?.includes("read-all"));
  assert.ok(adminRole.statements.projects?.includes("manage-team"));
  assert.ok(adminRole.statements.projects?.includes("view-budget"));
  assert.ok(adminRole.statements.tasks?.includes("delete"));
  assert.equal("projects" in superAdminRole.statements, false);
  assert.equal("tasks" in superAdminRole.statements, false);
  assert.equal(new Set<string>(staffRole.statements.projects).has("read-all"), false);
  assert.equal(new Set<string>(staffRole.statements.projects).has("view-budget"), false);
  assert.equal(new Set<string>(staffRole.statements.tasks).has("delete"), false);
});

test("organization admins receive management permissions for operational models", () => {
  assert.deepEqual(adminRole.statements.leave, ["create", "read-own", "cancel-own", "read-all", "review"]);
  assert.deepEqual(adminRole.statements.holidays, ["read", "create", "update", "delete"]);
  assert.deepEqual(adminRole.statements.salary, ["read-own", "read-all", "create", "update", "mark-paid"]);
  assert.deepEqual(adminRole.statements.tariffs, ["create", "read", "update", "delete"]);
  assert.equal("leave" in superAdminRole.statements, false);
  assert.equal("attendance" in superAdminRole.statements, false);
  assert.equal("salary" in superAdminRole.statements, false);
  assert.equal("tariffs" in superAdminRole.statements, false);
});

test("global admin role does not receive organization CRM permissions", () => {
  assert.equal("company" in superAdminRole.statements, false);
  assert.equal("bankAccounts" in superAdminRole.statements, false);
  assert.equal("customers" in superAdminRole.statements, false);
  assert.equal("dashboard" in superAdminRole.statements, false);
  assert.equal("company" in adminRole.statements, false);
  assert.equal("bankAccounts" in adminRole.statements, false);
});

test("organization admins can navigate to company profile settings only", () => {
  assert.equal(
    canAccessRoute("/dashboard/settings/business/company", UserRole.ADMIN),
    true,
  );
  assert.equal(
    canAccessRoute("/dashboard/settings/business/company", UserRole.STAFF, "HR"),
    false,
  );
  assert.equal(
    canAccessRoute("/dashboard/settings/business/banks", UserRole.ADMIN),
    false,
  );
});

test("organization admin role has company and bank account permissions", () => {
  assert.ok(organizationAdminRole.statements.company?.includes("read"));
  assert.ok(organizationAdminRole.statements.company?.includes("update"));
  assert.ok(organizationAdminRole.statements.bankAccounts?.includes("read"));
});

test("tariff routes align with tariff resource permissions", () => {
  assert.equal(canAccessRoute("/dashboard/tariffs", UserRole.STAFF), false);
  assert.equal(canAccessRoute("/dashboard/tariffs", UserRole.ADMIN), true);
  assert.equal(canAccessRoute("/dashboard/tariffs", UserRole.SUPER_ADMIN), false);
});

test("salary management route excludes non-HR staff", () => {
  assert.equal(canAccessRoute("/dashboard/salary", UserRole.STAFF, "SALES"), false);
  assert.equal(canAccessRoute("/dashboard/salary", UserRole.STAFF, "DEVELOPMENT"), false);
  assert.equal(canAccessRoute("/dashboard/salary", UserRole.STAFF, null), false);
  assert.equal(canAccessRoute("/dashboard/salary", UserRole.STAFF, "HR"), true);
  assert.equal(canAccessRoute("/dashboard/salary", UserRole.ADMIN), true);
  assert.equal(canAccessRoute("/dashboard/salary", UserRole.SUPER_ADMIN), false);
});

test("work schedule access is controlled by organization attendance permissions", () => {
  assert.deepEqual(
    getOrganizationRoutePermissions("/dashboard/attendance/schedule"),
    [{ resource: "attendance", permission: "manage" }],
  );
});

test("customer, proposal, and invoice routes are limited to admins and HR/Sales staff", () => {
  for (const path of [
    "/dashboard/customers",
    "/dashboard/customers/create",
    "/dashboard/proposals",
    "/dashboard/proposals/create",
    "/dashboard/invoices",
    "/dashboard/invoices/create",
  ]) {
    assert.equal(canAccessRoute(path, UserRole.ADMIN), true, `${path} should allow admins`);
    assert.equal(canAccessRoute(path, UserRole.SUPER_ADMIN), false, `${path} should deny platform admins`);
    assert.equal(canAccessRoute(path, UserRole.STAFF, "HR"), true, `${path} should allow HR staff`);
    assert.equal(canAccessRoute(path, UserRole.STAFF, "SALES"), true, `${path} should allow Sales staff`);
    assert.equal(canAccessRoute(path, UserRole.STAFF, "DEVELOPMENT"), false, `${path} should deny Development staff`);
    assert.equal(canAccessRoute(path, UserRole.STAFF, null), false, `${path} should deny staff without a department`);
  }
});

test("business workspace access matches the customer, proposal, and invoice route policy", () => {
  assert.equal(hasBusinessWorkspaceAccess({ role: UserRole.ADMIN }), true);
  assert.equal(hasBusinessWorkspaceAccess({ role: UserRole.SUPER_ADMIN }), false);
  assert.equal(hasBusinessWorkspaceAccess({ role: UserRole.STAFF, department: "HR" }), true);
  assert.equal(hasBusinessWorkspaceAccess({ role: UserRole.STAFF, department: "SALES" }), true);
  assert.equal(hasBusinessWorkspaceAccess({ role: UserRole.STAFF, department: "DEVELOPMENT" }), false);
  assert.equal(hasBusinessWorkspaceAccess({ role: UserRole.STAFF, department: null }), false);
});
