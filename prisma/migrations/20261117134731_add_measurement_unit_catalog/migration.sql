-- CreateTable
CREATE TABLE "measurement_unit" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "uqcCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "measurement_unit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "measurement_unit_organizationId_idx" ON "measurement_unit"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "measurement_unit_organizationId_name_key" ON "measurement_unit"("organizationId", "name");

-- AddForeignKey
ALTER TABLE "measurement_unit" ADD CONSTRAINT "measurement_unit_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
