ALTER TABLE "Company" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "attendance_settings" ADD COLUMN "organizationId" TEXT;

CREATE UNIQUE INDEX "Company_organizationId_key" ON "Company"("organizationId");
CREATE UNIQUE INDEX "attendance_settings_organizationId_key" ON "attendance_settings"("organizationId");

ALTER TABLE "Company"
ADD CONSTRAINT "Company_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "organization"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "attendance_settings"
ADD CONSTRAINT "attendance_settings_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "organization"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
