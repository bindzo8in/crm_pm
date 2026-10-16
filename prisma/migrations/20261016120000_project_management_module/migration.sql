CREATE TYPE "ProjectStatus" AS ENUM (
  'PLANNING',
  'NOT_STARTED',
  'IN_PROGRESS',
  'ON_HOLD',
  'COMPLETED',
  'CANCELLED'
);

CREATE TYPE "ProjectPriority" AS ENUM (
  'LOW',
  'MEDIUM',
  'HIGH',
  'URGENT'
);

CREATE TYPE "ProjectTaskStatus" AS ENUM (
  'TODO',
  'IN_PROGRESS',
  'BLOCKED',
  'DONE',
  'CANCELLED'
);

CREATE TYPE "ProjectActivityType" AS ENUM (
  'CREATED',
  'PROPOSAL_CONVERTED',
  'DETAILS_UPDATED',
  'STATUS_CHANGED',
  'TEAM_MEMBER_ADDED',
  'TEAM_MEMBER_REMOVED',
  'TASK_CREATED',
  'TASK_UPDATED'
);

CREATE TABLE "Project" (
  "id" TEXT NOT NULL,
  "projectNumber" SERIAL NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "objectives" TEXT,
  "scope" TEXT,
  "internalNotes" TEXT,
  "customerId" TEXT,
  "proposalId" TEXT,
  "proposalSnapshot" JSONB,
  "projectManagerId" TEXT,
  "createdById" TEXT,
  "status" "ProjectStatus" NOT NULL DEFAULT 'PLANNING',
  "priority" "ProjectPriority" NOT NULL DEFAULT 'MEDIUM',
  "startDate" TIMESTAMP(3),
  "dueDate" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "budgetAmount" DECIMAL(12,2),
  "currency" TEXT NOT NULL DEFAULT 'INR',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProjectMember" (
  "projectId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" TEXT,
  "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProjectMember_pkey" PRIMARY KEY ("projectId", "userId")
);

CREATE TABLE "ProjectTask" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "status" "ProjectTaskStatus" NOT NULL DEFAULT 'TODO',
  "priority" "ProjectPriority" NOT NULL DEFAULT 'MEDIUM',
  "dueDate" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "assigneeId" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProjectTask_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProjectActivity" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "actorId" TEXT,
  "type" "ProjectActivityType" NOT NULL,
  "message" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProjectActivity_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Project_projectNumber_key" ON "Project"("projectNumber");
CREATE UNIQUE INDEX "Project_proposalId_key" ON "Project"("proposalId");
CREATE INDEX "Project_customerId_deletedAt_idx" ON "Project"("customerId", "deletedAt");
CREATE INDEX "Project_projectManagerId_deletedAt_idx" ON "Project"("projectManagerId", "deletedAt");
CREATE INDEX "Project_status_dueDate_idx" ON "Project"("status", "dueDate");
CREATE INDEX "Project_deletedAt_updatedAt_idx" ON "Project"("deletedAt", "updatedAt");
CREATE INDEX "ProjectMember_userId_projectId_idx" ON "ProjectMember"("userId", "projectId");
CREATE INDEX "ProjectTask_projectId_status_dueDate_idx" ON "ProjectTask"("projectId", "status", "dueDate");
CREATE INDEX "ProjectTask_assigneeId_status_idx" ON "ProjectTask"("assigneeId", "status");
CREATE INDEX "ProjectActivity_projectId_createdAt_idx" ON "ProjectActivity"("projectId", "createdAt");
CREATE INDEX "ProjectActivity_actorId_createdAt_idx" ON "ProjectActivity"("actorId", "createdAt");

ALTER TABLE "Project" ADD CONSTRAINT "Project_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Project" ADD CONSTRAINT "Project_proposalId_fkey"
  FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Project" ADD CONSTRAINT "Project_projectManagerId_fkey"
  FOREIGN KEY ("projectManagerId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Project" ADD CONSTRAINT "Project_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProjectMember" ADD CONSTRAINT "ProjectMember_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectMember" ADD CONSTRAINT "ProjectMember_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectTask" ADD CONSTRAINT "ProjectTask_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectTask" ADD CONSTRAINT "ProjectTask_assigneeId_fkey"
  FOREIGN KEY ("assigneeId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProjectTask" ADD CONSTRAINT "ProjectTask_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProjectActivity" ADD CONSTRAINT "ProjectActivity_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectActivity" ADD CONSTRAINT "ProjectActivity_actorId_fkey"
  FOREIGN KEY ("actorId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
