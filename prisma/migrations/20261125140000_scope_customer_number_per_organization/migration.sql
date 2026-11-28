ALTER TABLE public."Customer"
  DROP CONSTRAINT IF EXISTS "Customer_customerNumber_key";

DROP INDEX IF EXISTS public."Customer_customerNumber_key";

CREATE UNIQUE INDEX IF NOT EXISTS "Customer_organizationId_customerNumber_key"
  ON public."Customer" ("organizationId", "customerNumber");
