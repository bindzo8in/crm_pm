-- AlterTable
ALTER TABLE "attendance_record" ADD COLUMN "distanceFromOffice" INTEGER;

-- AlterTable
ALTER TABLE "attendance_settings" ADD COLUMN "officeLatitude" DOUBLE PRECISION,
ADD COLUMN "officeLongitude" DOUBLE PRECISION,
ADD COLUMN "officeRadiusMeters" INTEGER NOT NULL DEFAULT 500,
ADD COLUMN "enforceOfficeGeofence" BOOLEAN NOT NULL DEFAULT true;
