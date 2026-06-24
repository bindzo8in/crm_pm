/*
  Warnings:

  - Added the required column `customerNumber` to the `Customer` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Customer" DROP COLUMN "customerNumber",
ADD COLUMN     "customerNumber" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Customer_customerNumber_key" ON "Customer"("customerNumber");
