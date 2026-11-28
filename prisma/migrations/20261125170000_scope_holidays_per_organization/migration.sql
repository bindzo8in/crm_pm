ALTER TABLE public.holiday
  DROP CONSTRAINT IF EXISTS holiday_date_key;

DROP INDEX IF EXISTS public.holiday_date_key;

CREATE UNIQUE INDEX IF NOT EXISTS holiday_organizationId_date_key
  ON public.holiday ("organizationId", date);
