ALTER TABLE "user"
ALTER COLUMN "role" DROP DEFAULT,
ALTER COLUMN "role" TYPE TEXT USING "role"::text,
ALTER COLUMN "role" SET DEFAULT 'USER';

CREATE TABLE "organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logo" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "member" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "member_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "invitation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "teamId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "inviterId" TEXT NOT NULL,

    CONSTRAINT "invitation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "organization_role" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "permission" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_role_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "team" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "team_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "team_member" (
    "teamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_member_pkey" PRIMARY KEY ("teamId", "userId")
);

ALTER TABLE "session"
ADD COLUMN "activeOrganizationId" TEXT,
ADD COLUMN "activeTeamId" TEXT;

CREATE UNIQUE INDEX "organization_slug_key" ON "organization"("slug");
CREATE UNIQUE INDEX "member_organizationId_userId_key" ON "member"("organizationId", "userId");
CREATE INDEX "member_userId_idx" ON "member"("userId");
CREATE INDEX "invitation_organizationId_idx" ON "invitation"("organizationId");
CREATE INDEX "invitation_email_idx" ON "invitation"("email");
CREATE UNIQUE INDEX "organization_role_organizationId_role_key" ON "organization_role"("organizationId", "role");
CREATE INDEX "organization_role_organizationId_idx" ON "organization_role"("organizationId");
CREATE INDEX "team_organizationId_name_idx" ON "team"("organizationId", "name");
CREATE INDEX "team_member_userId_idx" ON "team_member"("userId");

ALTER TABLE "member"
ADD CONSTRAINT "member_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "organization"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "member"
ADD CONSTRAINT "member_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "user"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "invitation"
ADD CONSTRAINT "invitation_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "organization"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "invitation"
ADD CONSTRAINT "invitation_inviterId_fkey"
FOREIGN KEY ("inviterId") REFERENCES "user"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "organization_role"
ADD CONSTRAINT "organization_role_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "organization"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "team"
ADD CONSTRAINT "team_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "organization"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "team_member"
ADD CONSTRAINT "team_member_teamId_fkey"
FOREIGN KEY ("teamId") REFERENCES "team"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "team_member"
ADD CONSTRAINT "team_member_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "user"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
