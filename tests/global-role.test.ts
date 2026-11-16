import assert from "node:assert/strict";
import test from "node:test";
import { globalRoleSchema, isGlobalRole, isPlatformSuperAdmin } from "../lib/global-role";

test("global roles accept only platform super-admin and regular user", () => {
  assert.equal(globalRoleSchema.parse("SUPER_ADMIN"), "SUPER_ADMIN");
  assert.equal(globalRoleSchema.parse("USER"), "USER");
  assert.equal(isGlobalRole("ADMIN"), false);
  assert.equal(isGlobalRole("STAFF"), false);
  assert.equal(isGlobalRole("owner"), false);
});

test("only the global super-admin role passes the platform-admin check", () => {
  assert.equal(isPlatformSuperAdmin("SUPER_ADMIN"), true);
  assert.equal(isPlatformSuperAdmin("USER"), false);
  assert.equal(isPlatformSuperAdmin("ADMIN"), false);
});
