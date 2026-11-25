ALTER TABLE public."Project"
  DROP CONSTRAINT IF EXISTS "Project_projectNumber_key";

DROP INDEX IF EXISTS public."Project_projectNumber_key";

CREATE UNIQUE INDEX IF NOT EXISTS "Project_organizationId_projectNumber_key"
  ON public."Project" ("organizationId", "projectNumber");
