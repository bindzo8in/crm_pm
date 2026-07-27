-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'LATE', 'HALF_DAY', 'ABSENT', 'ON_LEAVE');

-- CreateEnum
CREATE TYPE "WorkMode" AS ENUM ('OFFICE', 'REMOTE', 'HYBRID');

-- CreateTable
CREATE TABLE "attendance_record" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "clockIn" TIMESTAMP(3) NOT NULL,
    "clockOut" TIMESTAMP(3),
    "status" "AttendanceStatus" NOT NULL DEFAULT 'PRESENT',
    "workMode" "WorkMode" NOT NULL DEFAULT 'OFFICE',
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "deviceInfo" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "locationName" TEXT,
    "selfieUrl" TEXT,
    "selfiePublicId" TEXT,
    "notes" TEXT,
    "earlyLeave" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_record_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_break" (
    "id" TEXT NOT NULL,
    "attendanceRecordId" TEXT NOT NULL,
    "breakStart" TIMESTAMP(3) NOT NULL,
    "breakEnd" TIMESTAMP(3),
    "type" TEXT NOT NULL DEFAULT 'LUNCH',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_break_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_settings" (
    "id" TEXT NOT NULL,
    "expectedClockIn" TEXT NOT NULL DEFAULT '09:00',
    "expectedClockOut" TEXT NOT NULL DEFAULT '18:00',
    "gracePeriodMinutes" INTEGER NOT NULL DEFAULT 15,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "attendance_record_userId_idx" ON "attendance_record"("userId");

-- CreateIndex
CREATE INDEX "attendance_record_date_idx" ON "attendance_record"("date");

-- CreateIndex
CREATE INDEX "attendance_record_status_idx" ON "attendance_record"("status");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_record_userId_date_key" ON "attendance_record"("userId", "date");

-- CreateIndex
CREATE INDEX "attendance_break_attendanceRecordId_idx" ON "attendance_break"("attendanceRecordId");

-- AddForeignKey
ALTER TABLE "attendance_record" ADD CONSTRAINT "attendance_record_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_break" ADD CONSTRAINT "attendance_break_attendanceRecordId_fkey" FOREIGN KEY ("attendanceRecordId") REFERENCES "attendance_record"("id") ON DELETE CASCADE ON UPDATE CASCADE;
