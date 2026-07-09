-- AlterTable
ALTER TABLE "Proposal" ADD COLUMN     "acceptedAt" TIMESTAMP(3),
ADD COLUMN     "clientSignature" JSONB;
