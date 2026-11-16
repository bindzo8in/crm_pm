import assert from "node:assert/strict";
import test from "node:test";
import { customerReadFilter } from "../lib/customer-permissions";
import { getOrganizationRoutePermissions } from "../lib/route-permissions";

test("read-own limits customer queries to the signed-in creator", () => {
  assert.deepEqual(
    customerReadFilter({ userId: "user-1", canReadAll: false }),
    { createdById: "user-1" },
  );
});

test("read grants access to customers from every creator", () => {
  assert.deepEqual(
    customerReadFilter({ userId: "user-1", canReadAll: true }),
    {},
  );
});

test("the customer directory route allows the own-record permission", () => {
  assert.deepEqual(
    getOrganizationRoutePermissions("/dashboard/customers"),
    [
      { resource: "customers", permission: "read" },
      { resource: "customers", permission: "read-own" },
    ],
  );
});
