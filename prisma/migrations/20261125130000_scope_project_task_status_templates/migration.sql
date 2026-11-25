ALTER TABLE public."ProjectTaskStatusTemplate"
  DROP CONSTRAINT IF EXISTS "ProjectTaskStatusTemplate_name_key";

DROP INDEX IF EXISTS public."ProjectTaskStatusTemplate_name_key";
