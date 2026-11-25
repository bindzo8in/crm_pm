CREATE INDEX IF NOT EXISTS customer_org_active_display_name_normalized_idx
ON public."Customer" (
  "organizationId",
  LOWER(REGEXP_REPLACE(BTRIM("displayName"), '[[:space:]]+', ' ', 'g'))
)
WHERE "deletedAt" IS NULL;

CREATE OR REPLACE FUNCTION prevent_duplicate_active_customer_display_name()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  normalized_display_name TEXT;
BEGIN
  IF NEW."deletedAt" IS NOT NULL THEN
    RETURN NEW;
  END IF;

  normalized_display_name :=
    LOWER(REGEXP_REPLACE(BTRIM(NEW."displayName"), '[[:space:]]+', ' ', 'g'));

  IF TG_OP = 'UPDATE' THEN
    IF normalized_display_name =
         LOWER(REGEXP_REPLACE(BTRIM(OLD."displayName"), '[[:space:]]+', ' ', 'g'))
       AND NEW."deletedAt" IS NOT DISTINCT FROM OLD."deletedAt"
       AND NEW."organizationId" IS NOT DISTINCT FROM OLD."organizationId" THEN
      RETURN NEW;
    END IF;
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended(COALESCE(NEW."organizationId", '') || E'\x1f' || normalized_display_name, 0)
  );

  IF EXISTS (
    SELECT 1
    FROM public."Customer" AS customer
    WHERE customer."deletedAt" IS NULL
      AND customer."organizationId" IS NOT DISTINCT FROM NEW."organizationId"
      AND customer."id" <> NEW."id"
      AND LOWER(REGEXP_REPLACE(BTRIM(customer."displayName"), '[[:space:]]+', ' ', 'g'))
          = normalized_display_name
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23505',
      MESSAGE = 'A customer with this display name already exists in this organization.',
      CONSTRAINT = 'customer_active_display_name_unique';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS customer_active_display_name_unique ON public."Customer";

CREATE TRIGGER customer_active_display_name_unique
BEFORE INSERT OR UPDATE OF "displayName", "deletedAt", "organizationId"
ON public."Customer"
FOR EACH ROW
EXECUTE FUNCTION prevent_duplicate_active_customer_display_name();
