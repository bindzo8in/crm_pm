/*
  Warnings:

  - You are about to drop the column `deletedAt` on the `ServicePackage` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Service" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ServicePackage" DROP COLUMN "deletedAt";
