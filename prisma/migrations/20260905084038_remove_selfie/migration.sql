/*
  Warnings:

  - You are about to drop the column `selfiePublicId` on the `attendance_record` table. All the data in the column will be lost.
  - You are about to drop the column `selfieUrl` on the `attendance_record` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "attendance_record" DROP COLUMN "selfiePublicId",
DROP COLUMN "selfieUrl";
