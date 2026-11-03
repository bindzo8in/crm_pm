import assert from "node:assert/strict";
import test from "node:test";
import { canTransitionProject } from "../lib/project-policy";
import {
  projectQuerySchema,
  projectTaskFolderCreateSchema,
  projectTaskFolderUpdateSchema,
  projectTaskInputSchema,
  projectTeamUpdateSchema,
  projectTaskWorkspaceQuerySchema,
} from "../lib/schemas/project-schema";
import {
  DEFAULT_TASK_WORKFLOW,
  taskWorkflowStatusesSchema,
} from "../lib/task-status";

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
      view: "grid",
      pageSize: 25,
      cursor: 4,
    },
  );
  assert.equal(projectQuerySchema.safeParse({ pageSize: "2" }).success, false);
  assert.deepEqual(
    projectQuerySchema.parse({
      status: ["IN_PROGRESS", "COMPLETED"],
      priority: ["URGENT", "HIGH", "HIGH"],
      projectManagerId: ["unassigned", "manager-1"],
      memberId: ["member-1", "member-2"],
    }),
    {
      status: ["IN_PROGRESS", "COMPLETED"],
      priority: ["URGENT", "HIGH"],
      projectManagerId: ["unassigned", "manager-1"],
      memberId: ["member-1", "member-2"],
      direction: "next",
      sortDirection: "desc",
      view: "grid",
      pageSize: 25,
    },
  );
});

test("project task workspace filters default and validate supported views", () => {
  assert.deepEqual(projectTaskWorkspaceQuerySchema.parse({}), {
    view: "all",
    pageSize: 30,
  });
  assert.deepEqual(
    projectTaskWorkspaceQuerySchema.parse({
      view: "overdue",
      status: ["IN_PROGRESS", "TODO"],
      priority: ["HIGH", "URGENT"],
      cursor: "task_cursor",
      pageSize: "50",
    }),
    {
      view: "overdue",
      status: ["IN_PROGRESS", "TODO"],
      priority: ["HIGH", "URGENT"],
      cursor: "task_cursor",
      pageSize: 50,
    },
  );
  assert.deepEqual(
    projectQuerySchema.parse({ status: "IN_PROGRESS", priority: ["HIGH", "HIGH"] }),
    {
      status: ["IN_PROGRESS"],
      priority: ["HIGH"],
      direction: "next",
      sortDirection: "desc",
      view: "grid",
      pageSize: 25,
    },
  );
  assert.equal(projectTaskWorkspaceQuerySchema.safeParse({ view: "calendar" }).success, false);
});

test("project team updates keep the manager separate from members", () => {
  assert.equal(
    projectTeamUpdateSchema.safeParse({
      projectId: "project-1",
      projectManagerId: "manager-1",
      teamMemberIds: ["member-1", "member-2"],
    }).success,
    true,
  );
  assert.equal(
    projectTeamUpdateSchema.safeParse({
      projectId: "project-1",
      projectManagerId: "manager-1",
      teamMemberIds: ["manager-1"],
    }).success,
    false,
  );
  assert.equal(
    projectTeamUpdateSchema.safeParse({
      projectId: "project-1",
      projectManagerId: null,
      teamMemberIds: ["member-1", "member-1"],
    }).success,
    false,
  );
});

test("task workflows allow custom statuses while requiring every workflow group", () => {
  assert.equal(taskWorkflowStatusesSchema.safeParse(DEFAULT_TASK_WORKFLOW).success, true);
  const customWorkflow = [
    ...DEFAULT_TASK_WORKFLOW,
    {
      id: "READY_FOR_REVIEW",
      name: "Ready for review",
      group: "ACTIVE",
      color: "#7c3aed",
    },
  ];
  assert.equal(taskWorkflowStatusesSchema.safeParse(customWorkflow).success, true);
  assert.equal(
    taskWorkflowStatusesSchema.safeParse([
      ...customWorkflow,
      { ...customWorkflow[0], name: "Duplicate ID" },
    ]).success,
    false,
  );
  assert.equal(
    taskWorkflowStatusesSchema.safeParse(
      customWorkflow.filter((status) => status.group !== "CLOSED"),
    ).success,
    false,
  );
});

test("task status filters accept custom workflow status IDs", () => {
  assert.deepEqual(
    projectTaskWorkspaceQuerySchema.parse({
      status: ["project-1:READY_FOR_REVIEW", "TODO"],
    }).status,
    ["project-1:READY_FOR_REVIEW", "TODO"],
  );
});

test("task creation accepts project folders and scheduling fields", () => {
  assert.equal(
    projectTaskInputSchema.safeParse({
      projectId: "project-1",
      folderId: "folder-1",
      title: "Prepare launch plan",
      status: "READY",
      startDate: "2026-11-04",
      dueDate: "2026-11-10",
      timeEstimateMinutes: 150,
      sprintPoints: 5,
    }).success,
    true,
  );
  assert.equal(
    projectTaskInputSchema.safeParse({
      projectId: "project-1",
      title: "Invalid schedule",
      startDate: "2026-11-10",
      dueDate: "2026-11-04",
    }).success,
    false,
  );
});

test("project task folder inputs validate names and parent relationships", () => {
  assert.equal(
    projectTaskFolderCreateSchema.safeParse({
      projectId: "project-1",
      name: "Website",
      parentId: null,
    }).success,
    true,
  );
  assert.equal(
    projectTaskFolderUpdateSchema.safeParse({
      projectId: "project-1",
      folderId: "folder-1",
      name: "Launch",
      parentId: "parent-1",
    }).success,
    true,
  );
  assert.equal(
    projectTaskFolderCreateSchema.safeParse({
      projectId: "project-1",
      name: " ",
    }).success,
    false,
  );
});
