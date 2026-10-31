import assert from "node:assert/strict";
import test from "node:test";
import { Department, UserRole } from "@/app/generated/prisma/enums";
import {
  canAssignUserDepartment,
  canManageEmploymentStatus,
  canManageUserDirectory,
} from "@/lib/permissions";
import { canAccessRoute } from "@/lib/route-permissions";

test("user directory access is limited to privileged users and HR staff", () => {
  assert.equal(
    canManageUserDirectory(UserRole.SUPER_ADMIN, null),
    true,
  );
  assert.equal(canManageUserDirectory(UserRole.ADMIN, null), true);
  assert.equal(
    canManageUserDirectory(UserRole.STAFF, Department.HR),
    true,
  );
  assert.equal(
    canManageUserDirectory(UserRole.STAFF, Department.SALES),
    false,
  );
  assert.equal(canManageUserDirectory(UserRole.STAFF, null), false);
});

test("HR may assign only staff departments, and users routing excludes other staff", () => {
  assert.equal(
    canAssignUserDepartment(
      UserRole.STAFF,
      Department.HR,
      UserRole.STAFF,
    ),
    true,
  );
  assert.equal(
    canAssignUserDepartment(
      UserRole.STAFF,
      Department.HR,
      UserRole.ADMIN,
    ),
    false,
  );
  assert.equal(
    canAssignUserDepartment(
      UserRole.STAFF,
      Department.SALES,
      UserRole.STAFF,
    ),
    false,
  );
  assert.equal(
    canAssignUserDepartment(
      UserRole.ADMIN,
      null,
      UserRole.ADMIN,
    ),
    false,
  );
  assert.equal(
    canAssignUserDepartment(
      UserRole.SUPER_ADMIN,
      null,
      UserRole.STAFF,
    ),
    true,
  );
  assert.equal(
    canAccessRoute("/dashboard/users", UserRole.STAFF, Department.HR),
    true,
  );
  assert.equal(
    canAccessRoute("/dashboard/users", UserRole.STAFF, Department.SALES),
    false,
  );
});

test("employment status management preserves HR and role boundaries", () => {
  assert.equal(
    canManageEmploymentStatus(UserRole.STAFF, Department.HR, UserRole.STAFF),
    true,
  );
  assert.equal(
    canManageEmploymentStatus(UserRole.STAFF, Department.HR, UserRole.ADMIN),
    false,
  );
  assert.equal(
    canManageEmploymentStatus(UserRole.STAFF, Department.SALES, UserRole.STAFF),
    false,
  );
  assert.equal(
    canManageEmploymentStatus(UserRole.ADMIN, null, UserRole.STAFF),
    true,
  );
  assert.equal(
    canManageEmploymentStatus(UserRole.ADMIN, null, UserRole.ADMIN),
    false,
  );
  assert.equal(
    canManageEmploymentStatus(
      UserRole.SUPER_ADMIN,
      null,
      UserRole.SUPER_ADMIN,
    ),
    false,
  );
});
