BEGIN;

ALTER TABLE "ProjectTask"
  ADD COLUMN IF NOT EXISTS "startDate" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "timeEstimateMinutes" INTEGER,
  ADD COLUMN IF NOT EXISTS "sprintPoints" INTEGER,
  ADD COLUMN IF NOT EXISTS "timeTrackedSeconds" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "parentTaskId" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ProjectTask_timeEstimateMinutes_check'
      AND conrelid = '"ProjectTask"'::regclass
  ) THEN
    ALTER TABLE "ProjectTask"
      ADD CONSTRAINT "ProjectTask_timeEstimateMinutes_check"
      CHECK ("timeEstimateMinutes" IS NULL OR "timeEstimateMinutes" >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ProjectTask_sprintPoints_check'
      AND conrelid = '"ProjectTask"'::regclass
  ) THEN
    ALTER TABLE "ProjectTask"
      ADD CONSTRAINT "ProjectTask_sprintPoints_check"
      CHECK ("sprintPoints" IS NULL OR ("sprintPoints" >= 0 AND "sprintPoints" <= 100));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ProjectTask_timeTrackedSeconds_check'
      AND conrelid = '"ProjectTask"'::regclass
  ) THEN
    ALTER TABLE "ProjectTask"
      ADD CONSTRAINT "ProjectTask_timeTrackedSeconds_check"
      CHECK ("timeTrackedSeconds" >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ProjectTask_parentTaskId_fkey'
      AND conrelid = '"ProjectTask"'::regclass
  ) THEN
    ALTER TABLE "ProjectTask"
      ADD CONSTRAINT "ProjectTask_parentTaskId_fkey"
      FOREIGN KEY ("parentTaskId") REFERENCES "ProjectTask"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "ProjectTask_parentTaskId_idx"
  ON "ProjectTask"("parentTaskId");

DO $$
BEGIN
  CREATE TYPE "ProjectTaskRelationType" AS ENUM ('BLOCKED_BY', 'RELATED_TO');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "ProjectTaskDependency" (
  "id" TEXT NOT NULL,
  "taskId" TEXT NOT NULL,
  "dependsOnTaskId" TEXT NOT NULL,
  "relationType" "ProjectTaskRelationType" NOT NULL DEFAULT 'BLOCKED_BY',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProjectTaskDependency_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProjectTaskDependency_taskId_fkey"
    FOREIGN KEY ("taskId") REFERENCES "ProjectTask"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ProjectTaskDependency_dependsOnTaskId_fkey"
    FOREIGN KEY ("dependsOnTaskId") REFERENCES "ProjectTask"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ProjectTaskDependency_not_self_check" CHECK ("taskId" <> "dependsOnTaskId")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ProjectTaskDependency_taskId_dependsOnTaskId_key"
  ON "ProjectTaskDependency"("taskId", "dependsOnTaskId", "relationType");
CREATE INDEX IF NOT EXISTS "ProjectTaskDependency_dependsOnTaskId_idx"
  ON "ProjectTaskDependency"("dependsOnTaskId");

CREATE TABLE IF NOT EXISTS "ProjectTaskChecklistItem" (
  "id" TEXT NOT NULL,
  "taskId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "isComplete" BOOLEAN NOT NULL DEFAULT false,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProjectTaskChecklistItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProjectTaskChecklistItem_taskId_fkey"
    FOREIGN KEY ("taskId") REFERENCES "ProjectTask"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "ProjectTaskChecklistItem_taskId_sortOrder_idx"
  ON "ProjectTaskChecklistItem"("taskId", "sortOrder");

CREATE TABLE IF NOT EXISTS "ProjectTaskAttachment" (
  "id" TEXT NOT NULL,
  "taskId" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "publicId" TEXT NOT NULL,
  "resourceType" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "fileSize" INTEGER NOT NULL,
  "uploadedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProjectTaskAttachment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProjectTaskAttachment_taskId_fkey"
    FOREIGN KEY ("taskId") REFERENCES "ProjectTask"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ProjectTaskAttachment_uploadedById_fkey"
    FOREIGN KEY ("uploadedById") REFERENCES "user"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "ProjectTaskAttachment_publicId_key"
  ON "ProjectTaskAttachment"("publicId");
CREATE INDEX IF NOT EXISTS "ProjectTaskAttachment_taskId_createdAt_idx"
  ON "ProjectTaskAttachment"("taskId", "createdAt");

CREATE TABLE IF NOT EXISTS "ProjectTaskComment" (
  "id" TEXT NOT NULL,
  "taskId" TEXT NOT NULL,
  "authorId" TEXT,
  "content" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProjectTaskComment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProjectTaskComment_taskId_fkey"
    FOREIGN KEY ("taskId") REFERENCES "ProjectTask"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ProjectTaskComment_authorId_fkey"
    FOREIGN KEY ("authorId") REFERENCES "user"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "ProjectTaskComment_taskId_createdAt_idx"
  ON "ProjectTaskComment"("taskId", "createdAt");

CREATE TABLE IF NOT EXISTS "ProjectTaskTimeEntry" (
  "id" TEXT NOT NULL,
  "taskId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endedAt" TIMESTAMP(3),
  "durationSeconds" INTEGER,
  CONSTRAINT "ProjectTaskTimeEntry_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProjectTaskTimeEntry_taskId_fkey"
    FOREIGN KEY ("taskId") REFERENCES "ProjectTask"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ProjectTaskTimeEntry_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "user"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ProjectTaskTimeEntry_valid_range_check"
    CHECK ("endedAt" IS NULL OR "endedAt" >= "startedAt"),
  CONSTRAINT "ProjectTaskTimeEntry_durationSeconds_check"
    CHECK ("durationSeconds" IS NULL OR "durationSeconds" >= 0)
);

CREATE INDEX IF NOT EXISTS "ProjectTaskTimeEntry_taskId_startedAt_idx"
  ON "ProjectTaskTimeEntry"("taskId", "startedAt");
CREATE INDEX IF NOT EXISTS "ProjectTaskTimeEntry_userId_endedAt_idx"
  ON "ProjectTaskTimeEntry"("userId", "endedAt");
CREATE UNIQUE INDEX IF NOT EXISTS "ProjectTaskTimeEntry_one_active_per_user_key"
  ON "ProjectTaskTimeEntry"("userId") WHERE "endedAt" IS NULL;

COMMIT;
