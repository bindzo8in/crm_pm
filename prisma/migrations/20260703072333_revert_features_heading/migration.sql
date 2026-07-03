/*
  Warnings:

  - You are about to drop the column `heading` on the `PackageFeature` table. All the data in the column will be lost.
  - You are about to drop the column `heading` on the `ProposalFeature` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "PackageFeature" DROP COLUMN "heading";

-- AlterTable
ALTER TABLE "ProposalFeature" DROP COLUMN "heading";
