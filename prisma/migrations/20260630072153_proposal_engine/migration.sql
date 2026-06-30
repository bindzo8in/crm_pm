/*
  Warnings:

  - The `proposalNumber` column on the `Proposal` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Proposal" DROP COLUMN "proposalNumber",
ADD COLUMN     "proposalNumber" SERIAL NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Proposal_proposalNumber_key" ON "Proposal"("proposalNumber");
