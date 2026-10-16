import assert from "node:assert/strict";
import test from "node:test";
import { UserRole } from "../app/generated/prisma/enums";
import {
  adminRole,
  prismaModelPermissions,
  staffRole,
  statement,
  superAdminRole,
} from "../lib/permissions";
import { canAccessRoute } from "../lib/route-permissions";
import { hasBusinessWorkspaceAccess } from "../lib/workspace-access";

test("every Prisma model maps to a declared RBAC resource", () => {
  for (const [model, resource] of Object.entries(prismaModelPermissions)) {
    assert.ok(resource in statement, `${model} maps to unknown resource ${resource}`);
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
  assert.equal("salary" in staffRole.statements, false);
  assert.equal("company" in staffRole.statements, false);
  assert.equal("bankAccounts" in staffRole.statements, false);
  assert.deepEqual(staffRole.statements.projects, ["read-assigned", "update-status"]);
  assert.deepEqual(staffRole.statements.tasks, ["read-assigned", "update-own"]);
});

test("project management stays scoped between staff and administrators", () => {
  for (const role of [adminRole, superAdminRole]) {
    assert.ok(role.statements.projects?.includes("read-all"));
    assert.ok(role.statements.projects?.includes("manage-team"));
    assert.ok(role.statements.projects?.includes("view-budget"));
    assert.ok(role.statements.tasks?.includes("delete"));
  }
  assert.equal(new Set<string>(staffRole.statements.projects).has("read-all"), false);
  assert.equal(new Set<string>(staffRole.statements.projects).has("view-budget"), false);
  assert.equal(new Set<string>(staffRole.statements.tasks).has("delete"), false);
});

test("admins and super admins receive management permissions for operational models", () => {
  for (const role of [adminRole, superAdminRole]) {
    assert.deepEqual(role.statements.leave, ["create", "read-own", "cancel-own", "read-all", "review"]);
    assert.deepEqual(role.statements.holidays, ["read", "create", "update", "delete"]);
    assert.deepEqual(role.statements.salary, ["read-own", "read-all", "create", "update", "mark-paid"]);
    assert.deepEqual(role.statements.tariffs, ["create", "read", "update", "delete"]);
  }
});

test("company and bank account administration remains super-admin-only", () => {
  assert.deepEqual(superAdminRole.statements.company, ["read", "update"]);
  assert.deepEqual(superAdminRole.statements.bankAccounts, ["read", "create", "update", "delete"]);
  assert.equal("company" in adminRole.statements, false);
  assert.equal("bankAccounts" in adminRole.statements, false);
});

test("tariff routes align with tariff resource permissions", () => {
  assert.equal(canAccessRoute("/dashboard/tariffs", UserRole.STAFF), false);
  assert.equal(canAccessRoute("/dashboard/tariffs", UserRole.ADMIN), true);
  assert.equal(canAccessRoute("/dashboard/tariffs", UserRole.SUPER_ADMIN), true);
});

test("salary management route excludes non-HR staff", () => {
  assert.equal(canAccessRoute("/dashboard/salary", UserRole.STAFF, "SALES"), false);
  assert.equal(canAccessRoute("/dashboard/salary", UserRole.STAFF, "DEVELOPMENT"), false);
  assert.equal(canAccessRoute("/dashboard/salary", UserRole.STAFF, null), false);
  assert.equal(canAccessRoute("/dashboard/salary", UserRole.STAFF, "HR"), true);
  assert.equal(canAccessRoute("/dashboard/salary", UserRole.ADMIN), true);
  assert.equal(canAccessRoute("/dashboard/salary", UserRole.SUPER_ADMIN), true);
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
    assert.equal(canAccessRoute(path, UserRole.SUPER_ADMIN), true, `${path} should allow super admins`);
    assert.equal(canAccessRoute(path, UserRole.STAFF, "HR"), true, `${path} should allow HR staff`);
    assert.equal(canAccessRoute(path, UserRole.STAFF, "SALES"), true, `${path} should allow Sales staff`);
    assert.equal(canAccessRoute(path, UserRole.STAFF, "DEVELOPMENT"), false, `${path} should deny Development staff`);
    assert.equal(canAccessRoute(path, UserRole.STAFF, null), false, `${path} should deny staff without a department`);
  }
});

test("business workspace access matches the customer, proposal, and invoice route policy", () => {
  assert.equal(hasBusinessWorkspaceAccess({ role: UserRole.ADMIN }), true);
  assert.equal(hasBusinessWorkspaceAccess({ role: UserRole.SUPER_ADMIN }), true);
  assert.equal(hasBusinessWorkspaceAccess({ role: UserRole.STAFF, department: "HR" }), true);
  assert.equal(hasBusinessWorkspaceAccess({ role: UserRole.STAFF, department: "SALES" }), true);
  assert.equal(hasBusinessWorkspaceAccess({ role: UserRole.STAFF, department: "DEVELOPMENT" }), false);
  assert.equal(hasBusinessWorkspaceAccess({ role: UserRole.STAFF, department: null }), false);
});
