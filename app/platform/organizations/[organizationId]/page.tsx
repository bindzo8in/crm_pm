import {
  CancelOwnerInvitationForm,
  InviteOrganizationOwnerForm,
} from "@/components/organization/owner-invitation-forms";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import prisma from "@/lib/prisma";
import { ArrowLeft, CheckCircle2, Clock3 } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

type OrganizationDetailsPageProps = {
  params: Promise<{ organizationId: string }>;
};

export default async function OrganizationDetailsPage({
  params,
}: OrganizationDetailsPageProps) {
  const { organizationId } = await params;
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      id: true,
      name: true,
      slug: true,
      createdAt: true,
      members: {
        where: { role: "owner" },
        select: {
          user: {
            select: { name: true, email: true, role: true },
          },
        },
      },
      invitations: {
        where: { role: "owner", status: "pending" },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          email: true,
          expiresAt: true,
        },
      },
    },
  });
  if (!organization) notFound();

  const owner = organization.members.find(
    (member) => member.user.role !== "SUPER_ADMIN",
  );
  const pendingInvitation = organization.invitations[0];

  return (
    <main className="mx-auto w-full max-w-4xl space-y-8 px-4 py-8 sm:px-8 sm:py-12">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/platform/organizations">
          <ArrowLeft className="mr-2 size-4" />
          All organizations
        </Link>
      </Button>

      <header className="space-y-3">
        <p className="text-sm font-medium text-primary">
          Platform organization
        </p>
        <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
          {organization.name}
        </h1>
        <p className="text-sm text-muted-foreground">
          Workspace address:{" "}
          <span className="font-medium text-foreground">
            {organization.slug}
          </span>
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Organization owner</CardTitle>
          <CardDescription>
            The invited owner creates their account, verifies their email, and
            completes organization setup.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {owner ? (
            <div className="flex items-start gap-3 rounded-lg border p-4">
              <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" />
              <div className="min-w-0">
                <p className="font-medium">{owner.user.name}</p>
                <p className="break-all text-sm text-muted-foreground">
                  {owner.user.email}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  The platform account remains outside this workspace.
                </p>
              </div>
            </div>
          ) : (
            <>
              {pendingInvitation && (
                <div className="flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <Clock3 className="mt-0.5 size-5 shrink-0 text-amber-600" />
                    <div className="min-w-0">
                      <p className="font-medium">Invitation pending</p>
                      <p className="break-all text-sm text-muted-foreground">
                        {pendingInvitation.email}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Expires{" "}
                        {pendingInvitation.expiresAt.toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <CancelOwnerInvitationForm
                    invitationId={pendingInvitation.id}
                  />
                </div>
              )}
              <InviteOrganizationOwnerForm
                organizationId={organization.id}
                pendingEmail={pendingInvitation?.email}
              />
            </>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Created {organization.createdAt.toLocaleDateString()}
      </p>
    </main>
  );
}
