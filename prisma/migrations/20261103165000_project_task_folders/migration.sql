BEGIN;

CREATE TABLE IF NOT EXISTS "ProjectTaskFolder" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "parentId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProjectTaskFolder_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ProjectTaskFolder_projectId_fkey'
      AND conrelid = '"ProjectTaskFolder"'::regclass
  ) THEN
    ALTER TABLE "ProjectTaskFolder"
      ADD CONSTRAINT "ProjectTaskFolder_projectId_fkey"
      FOREIGN KEY ("projectId") REFERENCES "Project"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ProjectTaskFolder_parentId_fkey'
      AND conrelid = '"ProjectTaskFolder"'::regclass
  ) THEN
    ALTER TABLE "ProjectTaskFolder"
      ADD CONSTRAINT "ProjectTaskFolder_parentId_fkey"
      FOREIGN KEY ("parentId") REFERENCES "ProjectTaskFolder"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "ProjectTaskFolder_projectId_parentId_name_idx"
  ON "ProjectTaskFolder"("projectId", "parentId", "name");

INSERT INTO "ProjectTaskFolder" ("id", "projectId", "name", "createdAt", "updatedAt")
SELECT md5('task-folder-general:' || project."id"), project."id", 'General',
       CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Project" AS project
WHERE NOT EXISTS (
  SELECT 1
  FROM "ProjectTaskFolder" AS folder
  WHERE folder."projectId" = project."id"
    AND folder."parentId" IS NULL
    AND folder."name" = 'General'
);

ALTER TABLE "ProjectTask"
  ADD COLUMN IF NOT EXISTS "folderId" TEXT;

UPDATE "ProjectTask" AS task
SET "folderId" = folder."id"
FROM "ProjectTaskFolder" AS folder
WHERE task."folderId" IS NULL
  AND folder."projectId" = task."projectId"
  AND folder."parentId" IS NULL
  AND folder."name" = 'General';

ALTER TABLE "ProjectTask"
  ALTER COLUMN "folderId" SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ProjectTask_folderId_fkey'
      AND conrelid = '"ProjectTask"'::regclass
  ) THEN
    ALTER TABLE "ProjectTask"
      ADD CONSTRAINT "ProjectTask_folderId_fkey"
      FOREIGN KEY ("folderId") REFERENCES "ProjectTaskFolder"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "ProjectTask_folderId_statusGroup_dueDate_idx"
  ON "ProjectTask"("folderId", "statusGroup", "dueDate");

COMMIT;
