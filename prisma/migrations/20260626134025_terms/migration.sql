-- CreateTable
CREATE TABLE "ProposalTerm" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProposalTerm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProposalTermService" (
    "termId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ProposalTermService_pkey" PRIMARY KEY ("termId","serviceId")
);

-- AddForeignKey
ALTER TABLE "ProposalTermService" ADD CONSTRAINT "ProposalTermService_termId_fkey" FOREIGN KEY ("termId") REFERENCES "ProposalTerm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProposalTermService" ADD CONSTRAINT "ProposalTermService_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;
