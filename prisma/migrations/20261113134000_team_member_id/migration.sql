ALTER TABLE "team_member"
DROP CONSTRAINT "team_member_pkey";

ALTER TABLE "team_member"
ADD COLUMN "id" TEXT;

UPDATE "team_member"
SET "id" = gen_random_uuid()::text;

ALTER TABLE "team_member"
ALTER COLUMN "id" SET NOT NULL;

ALTER TABLE "team_member"
ADD CONSTRAINT "team_member_pkey" PRIMARY KEY ("id");

CREATE UNIQUE INDEX "team_member_teamId_userId_key"
ON "team_member"("teamId", "userId");
