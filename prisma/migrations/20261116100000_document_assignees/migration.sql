ALTER TABLE "Proposal"
ADD COLUMN "assignedToId" TEXT;

ALTER TABLE "Invoice"
ADD COLUMN "assignedToId" TEXT;

CREATE INDEX "Proposal_assignedToId_idx"
ON "Proposal"("assignedToId");

CREATE INDEX "Invoice_assignedToId_deletedAt_idx"
ON "Invoice"("assignedToId", "deletedAt");

ALTER TABLE "Proposal"
ADD CONSTRAINT "Proposal_assignedToId_fkey"
FOREIGN KEY ("assignedToId") REFERENCES "user"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Invoice"
ADD CONSTRAINT "Invoice_assignedToId_fkey"
FOREIGN KEY ("assignedToId") REFERENCES "user"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
