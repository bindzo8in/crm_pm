-- CreateTable
CREATE TABLE "TariffGrid" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TariffGrid_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TariffGridPackage" (
    "id" TEXT NOT NULL,
    "tariffGridId" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TariffGridPackage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TariffGridPackage_tariffGridId_idx" ON "TariffGridPackage"("tariffGridId");

-- CreateIndex
CREATE INDEX "TariffGridPackage_packageId_idx" ON "TariffGridPackage"("packageId");

-- AddForeignKey
ALTER TABLE "TariffGridPackage" ADD CONSTRAINT "TariffGridPackage_tariffGridId_fkey" FOREIGN KEY ("tariffGridId") REFERENCES "TariffGrid"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TariffGridPackage" ADD CONSTRAINT "TariffGridPackage_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "ServicePackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
