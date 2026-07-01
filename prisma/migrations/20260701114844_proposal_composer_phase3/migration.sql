/*
  Warnings:

  - Added the required column `updatedAt` to the `ProposalBlock` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ProposalBlockType" ADD VALUE 'COVER';
ALTER TYPE "ProposalBlockType" ADD VALUE 'PRICING';
ALTER TYPE "ProposalBlockType" ADD VALUE 'FEATURES';
ALTER TYPE "ProposalBlockType" ADD VALUE 'TERMS';
ALTER TYPE "ProposalBlockType" ADD VALUE 'TIMELINE';
ALTER TYPE "ProposalBlockType" ADD VALUE 'SIGNATURE';
ALTER TYPE "ProposalBlockType" ADD VALUE 'CUSTOM';
ALTER TYPE "ProposalBlockType" ADD VALUE 'PAGE_BREAK';

-- AlterTable
ALTER TABLE "ProposalBlock" ADD COLUMN     "isLocked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isSystemGenerated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isVisible" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "sortOrder" SET DEFAULT 0;
