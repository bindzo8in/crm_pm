"use client";

import {
  acceptOrganizationInvitation,
  cancelOrganizationOwnerInvitation,
  inviteOrganizationOwner,
  signUpInvitedMember,
  type OrganizationInvitationActionState,
} from "@/actions/organization-invitations";
import { Password } from "@/components/password";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { signOut } from "@/lib/auth-client";
import { ArrowRight, MailCheck } from "lucide-react";
import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";

export function InviteOrganizationOwnerForm({
  organizationId,
  pendingEmail,
}: {
  organizationId: string;
  pendingEmail?: string;
}) {
  const [state, formAction, pending] = useActionState<
    OrganizationInvitationActionState,
    FormData
  >(inviteOrganizationOwner, {});

  return (
    <form action={formAction}>
      <input type="hidden" name="organizationId" value={organizationId} />
      <FieldGroup className="gap-4">
        <Field className="gap-2">
          <FieldLabel htmlFor="owner-email">Owner email</FieldLabel>
          <Input
            id="owner-email"
            name="email"
            type="email"
            autoComplete="email"
            defaultValue={pendingEmail}
            placeholder="owner@example.com"
            maxLength={254}
            required
          />
        </Field>
        {state.error && (
          <p role="alert" className="text-sm text-destructive">
            {state.error}
          </p>
        )}
        {state.success && (
          <p
            role="status"
            className="text-sm text-success"
            aria-live="polite"
          >
            {state.success}
          </p>
        )}
        <Button type="submit" disabled={pending}>
          {pending
            ? "Sending..."
            : pendingEmail
              ? "Resend owner invitation"
              : "Send owner invitation"}
        </Button>
      </FieldGroup>
    </form>
  );
}

export function CancelOwnerInvitationForm({
  invitationId,
}: {
  invitationId: string;
}) {
  const [state, formAction, pending] = useActionState<
    OrganizationInvitationActionState,
    FormData
  >(cancelOrganizationOwnerInvitation, {});

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="invitationId" value={invitationId} />
      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
      {state.success && (
        <p role="status" className="text-sm text-muted-foreground">
          {state.success}
        </p>
      )}
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        {pending ? "Canceling..." : "Cancel invitation"}
      </Button>
    </form>
  );
}

export function AcceptOrganizationInvitationForm({
  invitationId,
}: {
  invitationId: string;
}) {
  const [state, formAction, pending] = useActionState<
    OrganizationInvitationActionState,
    FormData
  >(  acceptOrganizationInvitation, {});

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="invitationId" value={invitationId} />
      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
      <Button
        type="submit"
        className="min-h-12 w-full justify-between px-5"
        disabled={pending}
      >
        {pending ? "Accepting invitation..." : "Accept invitation and continue"}
        <ArrowRight data-icon="inline-end" />
      </Button>
    </form>
  );
}

export function OrganizationInvitationSignupForm({
  invitationId,
  email,
  role,
}: {
  invitationId: string;
  email: string;
  role: string;
}) {
  const [state, formAction, pending] = useActionState<
    OrganizationInvitationActionState,
    FormData
  >(  signUpInvitedMember, {});

  if (state.success) {
    return (
      <section
        role="status"
        aria-live="polite"
        className="flex flex-col items-center gap-5 py-3 text-center"
      >
        <div className="flex size-16 items-center justify-center rounded-full bg-success/10 text-success ring-1 ring-success/20">
          <MailCheck aria-hidden="true" className="size-8" />
        </div>
        <div className="max-w-sm">
          <h2 className="font-heading text-2xl font-semibold tracking-tight">
            Check your inbox
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            We sent a verification link to
          </p>
          <p className="mt-1 break-all font-medium text-foreground">{email}</p>
        </div>
        <div className="w-full rounded-lg border bg-muted/40 p-4 text-left">
          <p className="text-sm font-medium">One more step</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Verify your email, then return to this page to accept the
            organization invitation{role === "owner" ? " and finish setting up your workspace" : ""}.
          </p>
        </div>
        <p className="max-w-sm text-xs leading-5 text-muted-foreground">
          No email yet? Check your spam folder. The verification link expires
          after 24 hours.
        </p>
      </section>
    );
  }

  return (
    <form action={formAction}>
      <input type="hidden" name="invitationId" value={invitationId} />
      <FieldGroup className="gap-4">
        <Field className="gap-2">
          <FieldLabel htmlFor="invited-email">Email address</FieldLabel>
          <Input
            id="invited-email"
            value={email}
            readOnly
            aria-label="Invited email address"
          />
        </Field>
        <Field className="gap-2">
          <FieldLabel htmlFor="invited-name">Your name</FieldLabel>
          <Input
            id="invited-name"
            name="name"
            autoComplete="name"
            maxLength={100}
            required
          />
        </Field>
        <Field className="gap-2">
          <FieldLabel htmlFor="invited-password">Password</FieldLabel>
          <Password
            id="invited-password"
            name="password"
            autoComplete="new-password"
            minLength={8}
            maxLength={128}
            placeholder="At least 8 characters"
            required
          />
          <FieldDescription>
            Use at least 8 characters. You can show or hide your password.
          </FieldDescription>
        </Field>
        <Field className="gap-2">
          <FieldLabel htmlFor="invited-confirm-password">
            Confirm password
          </FieldLabel>
          <Password
            id="invited-confirm-password"
            name="confirmPassword"
            autoComplete="new-password"
            minLength={8}
            maxLength={128}
            placeholder="Re-enter your password"
            required
          />
        </Field>
        {state.error && (
          <p role="alert" className="text-sm text-destructive">
            {state.error}
          </p>
        )}
        <Button type="submit" disabled={pending}>
          {pending ? "Creating account..." : "Create account"}
        </Button>
      </FieldGroup>
    </form>
  );
}

export function SignOutForInvitationButton() {
  const router = useRouter();
  const [signOutFailed, setSignOutFailed] = useState(false);

  async function handleSignOut() {
    await signOut({
      fetchOptions: {
        onSuccess: () => router.refresh(),
        onError: () => setSignOutFailed(true),
      },
    });
  }

  return (
    <div className="space-y-2">
      <Button type="button" variant="outline" onClick={handleSignOut}>
        Sign out
      </Button>
      {signOutFailed && (
        <p role="alert" className="text-sm text-destructive">
          Could not sign out. Please try again.
        </p>
      )}
    </div>
  );
}
