import {
  AcceptOrganizationInvitationForm,
  OrganizationInvitationSignupForm,
  SignOutForInvitationButton,
} from "@/components/organization/owner-invitation-forms";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { getPendingOrganizationInvitationById } from "@/lib/organization-invitation";
import { Building2, Clock3, LockKeyhole, ShieldCheck } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import type { ReactNode } from "react";

type AcceptInvitationPageProps = {
  searchParams: Promise<{ invitationId?: string | string[] }>;
};

export default async function AcceptInvitationPage({
  searchParams,
}: AcceptInvitationPageProps) {
  const { invitationId: searchInvitationId } = await searchParams;
  const invitationId = Array.isArray(searchInvitationId)
    ? searchInvitationId[0]
    : searchInvitationId;
  const invitation = await getPendingOrganizationInvitationById(
    invitationId ?? null,
  );
  const session = await auth.api.getSession({ headers: await headers() });

  if (!invitation) {
    return (
      <InvitationCard
        title="Invitation unavailable"
        description="This organization invitation is invalid, expired, or has already been accepted."
      >
        <Button asChild variant="outline">
          <Link href="/signin">Go to sign in</Link>
        </Button>
      </InvitationCard>
    );
  }

  const callbackPath = `/accept-invitation?invitationId=${encodeURIComponent(invitation.id)}`;
  const signInUrl = `/signin?callbackUrl=${encodeURIComponent(callbackPath)}`;
  const sessionEmail = session?.user.email.toLowerCase();
  const invitationEmail = invitation.email.toLowerCase();
  const workspaceDetails = {
    organizationName: invitation.organization.name,
    workspaceSlug: invitation.organization.slug,
    invitationRole: invitation.role,
  };

  if (session?.user && sessionEmail !== invitationEmail) {
    return (
      <InvitationCard
        {...workspaceDetails}
        title="Switch to the invited account"
        description={`This invitation was sent to ${invitation.email}. Sign out and continue with that email address.`}
      >
        <SignOutForInvitationButton />
      </InvitationCard>
    );
  }

  if (session?.user && !session.user.emailVerified) {
    return (
      <InvitationCard
        {...workspaceDetails}
        title="Verify your email"
        description={`Verify ${invitation.email} before accepting this invitation. Check your inbox for the verification link.`}
      >
        <Button asChild variant="outline">
          <Link href={signInUrl}>Open sign in</Link>
        </Button>
      </InvitationCard>
    );
  }

  return (
    <InvitationCard
      {...workspaceDetails}
      title={invitation.role === "owner" ? "Take ownership" : "Join your organization"}
      description={
        invitation.role === "owner"
          ? `Accept the owner invitation for ${invitation.organization.name} as ${invitation.email}. You’ll continue straight to organization setup.`
          : `Accept the invitation to join ${invitation.organization.name} as ${invitation.email}.`
      }
    >
      {session?.user ? (
        <AcceptOrganizationInvitationForm invitationId={invitation.id} />
      ) : (
        <div className="flex flex-col gap-6">
          <OrganizationInvitationSignupForm
            invitationId={invitation.id}
            email={invitation.email}
            role={invitation.role}
          />
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              href={signInUrl}
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Sign in to accept
            </Link>
          </p>
        </div>
      )}
    </InvitationCard>
  );
}

function InvitationCard({
  title,
  description,
  children,
  organizationName,
  workspaceSlug,
  invitationRole,
}: {
  title: string;
  description: string;
  children: ReactNode;
  organizationName?: string;
  workspaceSlug?: string;
  invitationRole?: string;
}) {
  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/40 p-4 sm:p-8">
      <Card className="grid w-full max-w-5xl grid-cols-1 gap-0 overflow-hidden p-0 lg:min-h-[560px] lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <aside className="flex flex-col justify-between gap-10 bg-primary p-7 text-primary-foreground sm:p-10 lg:p-12">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl border border-primary-foreground/20 bg-primary-foreground/10 font-heading text-lg font-semibold">
              B
            </div>
            <div>
              <p className="font-heading font-semibold">Bindzo8 CRM</p>
              <p className="text-xs text-primary-foreground/70">
                Workspace access
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <p className="text-sm font-medium text-primary-foreground/75">
              Organization workspace
            </p>
            <h2 className="max-w-sm break-words font-heading text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
              {organizationName ?? "Your workspace"}
            </h2>
            {workspaceSlug && (
              <p className="break-all text-sm text-primary-foreground/75">
                Workspace address:{" "}
                <span className="font-medium text-primary-foreground">
                  {workspaceSlug}
                </span>
              </p>
            )}
            {organizationName && invitationRole === "owner" ? (
              <div className="mt-3 border-t border-primary-foreground/20 pt-5">
                <p className="text-sm font-semibold">After you accept</p>
                <div className="mt-4 flex flex-col gap-3 text-sm text-primary-foreground/80">
                  <p className="flex items-center gap-3">
                    <Building2 aria-hidden="true" className="size-4 shrink-0" />
                    Add your company details
                  </p>
                  <p className="flex items-center gap-3">
                    <Clock3 aria-hidden="true" className="size-4 shrink-0" />
                    Set working hours and office location
                  </p>
                </div>
              </div>
            ) : organizationName ? (
              <p className="mt-3 border-t border-primary-foreground/20 pt-5 text-sm leading-6 text-primary-foreground/80">
                You’ll be able to access the workspace after accepting the
                invitation.
              </p>
            ) : (
              <p className="mt-3 border-t border-primary-foreground/20 pt-5 text-sm leading-6 text-primary-foreground/80">
                A current invitation is required to access an organization
                workspace.
              </p>
            )}
          </div>

          <p className="text-xs leading-5 text-primary-foreground/70">
            {organizationName && invitationRole === "owner"
              ? "Ownership transfers when you accept this invitation."
              : organizationName
                ? "This invitation is intended for its recipient only."
                : "Ask the organization administrator for a new invitation link."}
          </p>
        </aside>

        <section className="flex items-center p-6 sm:p-10 lg:p-14">
          <div className="mx-auto w-full max-w-md">
            <CardHeader className="gap-3 px-0 pt-0">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border bg-muted/40 px-3 py-1.5 text-xs font-medium text-muted-foreground">
                <ShieldCheck
                  aria-hidden="true"
                  className="size-4 text-primary"
                />
                {invitationRole === "owner"
                  ? "Owner invitation"
                  : "Organization invitation"}
              </div>
              <CardTitle
                role="heading"
                aria-level={1}
                className="font-heading text-3xl font-semibold leading-tight tracking-tight sm:text-4xl"
              >
                {title}
              </CardTitle>
              <CardDescription className="text-base leading-7">
                {description}
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0 pt-7">
              {children}
              <div className="mt-7 flex items-start gap-2 border-t pt-4 text-xs leading-5 text-muted-foreground">
                <LockKeyhole
                  aria-hidden="true"
                  className="mt-0.5 size-4 shrink-0"
                />
                This secure invitation is intended for its recipient only.
              </div>
            </CardContent>
          </div>
        </section>
      </Card>
    </main>
  );
}
