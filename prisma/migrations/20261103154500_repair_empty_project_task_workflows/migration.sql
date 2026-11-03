UPDATE "Project"
SET
  "taskStatuses" = '[
    {"id":"TODO","name":"To do","group":"NOT_STARTED","color":"#64748b"},
    {"id":"IN_PROGRESS","name":"In progress","group":"ACTIVE","color":"#2563eb"},
    {"id":"BLOCKED","name":"Blocked","group":"ACTIVE","color":"#d97706"},
    {"id":"DONE","name":"Done","group":"DONE","color":"#16a34a"},
    {"id":"CANCELLED","name":"Cancelled","group":"CLOSED","color":"#71717a"}
  ]'::jsonb,
  "workflowTemplateId" = COALESCE("workflowTemplateId", 'task-status-template-default')
WHERE "taskStatuses" = '[]'::jsonb;

ALTER TABLE "Project"
  ALTER COLUMN "taskStatuses" SET DEFAULT '[
    {"id":"TODO","name":"To do","group":"NOT_STARTED","color":"#64748b"},
    {"id":"IN_PROGRESS","name":"In progress","group":"ACTIVE","color":"#2563eb"},
    {"id":"BLOCKED","name":"Blocked","group":"ACTIVE","color":"#d97706"},
    {"id":"DONE","name":"Done","group":"DONE","color":"#16a34a"},
    {"id":"CANCELLED","name":"Cancelled","group":"CLOSED","color":"#71717a"}
  ]'::jsonb;
