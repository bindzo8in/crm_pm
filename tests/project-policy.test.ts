import assert from "node:assert/strict";
import test from "node:test";
import { canTransitionProject } from "../lib/project-policy";
import { projectQuerySchema } from "../lib/schemas/project-schema";

test("project transitions allow expected forward and recovery paths", () => {
  assert.equal(canTransitionProject("PLANNING", "NOT_STARTED"), true);
  assert.equal(canTransitionProject("IN_PROGRESS", "ON_HOLD"), true);
  assert.equal(canTransitionProject("IN_PROGRESS", "COMPLETED"), true);
  assert.equal(canTransitionProject("COMPLETED", "IN_PROGRESS"), true);
  assert.equal(canTransitionProject("CANCELLED", "PLANNING"), true);
});

test("project transitions reject invalid lifecycle jumps", () => {
  assert.equal(canTransitionProject("PLANNING", "COMPLETED"), false);
  assert.equal(canTransitionProject("NOT_STARTED", "COMPLETED"), false);
  assert.equal(canTransitionProject("COMPLETED", "CANCELLED"), false);
  assert.equal(canTransitionProject("CANCELLED", "IN_PROGRESS"), false);
});

test("project filters validate and default cursor paging consistently", () => {
  assert.deepEqual(
    projectQuerySchema.parse({ sortDirection: "asc", cursor: "4" }),
    {
      direction: "next",
      sortDirection: "asc",
      pageSize: 25,
      cursor: 4,
    },
  );
  assert.equal(projectQuerySchema.safeParse({ pageSize: "2" }).success, false);
});
