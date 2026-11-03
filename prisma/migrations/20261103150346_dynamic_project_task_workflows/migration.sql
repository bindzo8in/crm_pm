CREATE TYPE "ProjectTaskStatusGroup" AS ENUM (
  'NOT_STARTED',
  'ACTIVE',
  'DONE',
  'CLOSED'
);

CREATE TABLE "ProjectTaskStatusTemplate" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "statuses" JSONB NOT NULL,
  "isSystem" BOOLEAN NOT NULL DEFAULT false,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProjectTaskStatusTemplate_pkey" PRIMARY KEY ("id")
);

INSERT INTO "ProjectTaskStatusTemplate" ("id", "name", "statuses", "isSystem", "updatedAt")
VALUES
  ('task-status-template-default', 'Normal', '[
    {"id":"TODO","name":"To do","group":"NOT_STARTED","color":"#64748b"},
    {"id":"IN_PROGRESS","name":"In progress","group":"ACTIVE","color":"#2563eb"},
    {"id":"BLOCKED","name":"Blocked","group":"ACTIVE","color":"#d97706"},
    {"id":"DONE","name":"Done","group":"DONE","color":"#16a34a"},
    {"id":"CANCELLED","name":"Cancelled","group":"CLOSED","color":"#71717a"}
  ]'::jsonb, true, CURRENT_TIMESTAMP),
  ('task-status-template-content', 'Content', '[
    {"id":"TODO","name":"Ideas","group":"NOT_STARTED","color":"#64748b"},
    {"id":"IN_PROGRESS","name":"Writing","group":"ACTIVE","color":"#2563eb"},
    {"id":"BLOCKED","name":"In review","group":"ACTIVE","color":"#d97706"},
    {"id":"DONE","name":"Published","group":"DONE","color":"#16a34a"},
    {"id":"CANCELLED","name":"Dropped","group":"CLOSED","color":"#71717a"}
  ]'::jsonb, true, CURRENT_TIMESTAMP),
  ('task-status-template-kanban', 'Kanban', '[
    {"id":"TODO","name":"Backlog","group":"NOT_STARTED","color":"#64748b"},
    {"id":"IN_PROGRESS","name":"In progress","group":"ACTIVE","color":"#2563eb"},
    {"id":"BLOCKED","name":"Blocked","group":"ACTIVE","color":"#d97706"},
    {"id":"DONE","name":"Done","group":"DONE","color":"#16a34a"},
    {"id":"CANCELLED","name":"Closed","group":"CLOSED","color":"#71717a"}
  ]'::jsonb, true, CURRENT_TIMESTAMP),
  ('task-status-template-marketing', 'Marketing', '[
    {"id":"TODO","name":"Planned","group":"NOT_STARTED","color":"#64748b"},
    {"id":"IN_PROGRESS","name":"In progress","group":"ACTIVE","color":"#2563eb"},
    {"id":"BLOCKED","name":"Waiting","group":"ACTIVE","color":"#d97706"},
    {"id":"DONE","name":"Completed","group":"DONE","color":"#16a34a"},
    {"id":"CANCELLED","name":"Cancelled","group":"CLOSED","color":"#71717a"}
  ]'::jsonb, true, CURRENT_TIMESTAMP),
  ('task-status-template-scrum', 'Scrum', '[
    {"id":"TODO","name":"Sprint backlog","group":"NOT_STARTED","color":"#64748b"},
    {"id":"IN_PROGRESS","name":"In progress","group":"ACTIVE","color":"#2563eb"},
    {"id":"BLOCKED","name":"Blocked","group":"ACTIVE","color":"#d97706"},
    {"id":"DONE","name":"Done","group":"DONE","color":"#16a34a"},
    {"id":"CANCELLED","name":"Removed","group":"CLOSED","color":"#71717a"}
  ]'::jsonb, true, CURRENT_TIMESTAMP);

ALTER TABLE "Project"
  ADD COLUMN "taskStatuses" JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN "workflowTemplateId" TEXT;

UPDATE "Project"
SET
  "taskStatuses" = '[
    {"id":"TODO","name":"To do","group":"NOT_STARTED","color":"#64748b"},
    {"id":"IN_PROGRESS","name":"In progress","group":"ACTIVE","color":"#2563eb"},
    {"id":"BLOCKED","name":"Blocked","group":"ACTIVE","color":"#d97706"},
    {"id":"DONE","name":"Done","group":"DONE","color":"#16a34a"},
    {"id":"CANCELLED","name":"Cancelled","group":"CLOSED","color":"#71717a"}
  ]'::jsonb,
  "workflowTemplateId" = 'task-status-template-default';

ALTER TABLE "ProjectTask"
  ADD COLUMN "statusGroup" "ProjectTaskStatusGroup" NOT NULL DEFAULT 'NOT_STARTED';

UPDATE "ProjectTask"
SET "statusGroup" = CASE "status"::text
  WHEN 'TODO' THEN 'NOT_STARTED'::"ProjectTaskStatusGroup"
  WHEN 'DONE' THEN 'DONE'::"ProjectTaskStatusGroup"
  WHEN 'CANCELLED' THEN 'CLOSED'::"ProjectTaskStatusGroup"
  ELSE 'ACTIVE'::"ProjectTaskStatusGroup"
END;

ALTER TABLE "ProjectTask"
  ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "ProjectTask"
  ALTER COLUMN "status" TYPE TEXT USING "status"::text;

ALTER TABLE "ProjectTask"
  ALTER COLUMN "status" SET DEFAULT 'TODO';

DROP INDEX "ProjectTask_projectId_status_dueDate_idx";
DROP INDEX "ProjectTask_assigneeId_status_idx";
DROP TYPE "ProjectTaskStatus";

CREATE UNIQUE INDEX "ProjectTaskStatusTemplate_name_key"
  ON "ProjectTaskStatusTemplate"("name");
CREATE INDEX "ProjectTaskStatusTemplate_isSystem_name_idx"
  ON "ProjectTaskStatusTemplate"("isSystem", "name");
CREATE INDEX "Project_workflowTemplateId_idx"
  ON "Project"("workflowTemplateId");
CREATE INDEX "ProjectTask_projectId_statusGroup_dueDate_idx"
  ON "ProjectTask"("projectId", "statusGroup", "dueDate");
CREATE INDEX "ProjectTask_assigneeId_statusGroup_idx"
  ON "ProjectTask"("assigneeId", "statusGroup");

ALTER TABLE "ProjectTaskStatusTemplate"
  ADD CONSTRAINT "ProjectTaskStatusTemplate_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "user"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Project"
  ADD CONSTRAINT "Project_workflowTemplateId_fkey"
  FOREIGN KEY ("workflowTemplateId") REFERENCES "ProjectTaskStatusTemplate"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
