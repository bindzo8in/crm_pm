"use client"
import { SigninSchema, signinSchema } from '@/lib/schemas/signin-schema'
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, Controller } from "react-hook-form"
import { Mail } from "lucide-react"
import { Field, FieldGroup, FieldContent, FieldLabel, FieldError, FieldSeparator } from "@/components/ui/field"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Password } from "@/components/password"
import { sendVerificationEmail, signIn } from "@/lib/auth-client"
import { useState } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import Link from "next/link"
import type { OAuthProviderId } from "@/lib/oauth-provider-config"

const socialMediaButtons: {
  label: string;
  provider: OAuthProviderId;
}[] = [
  { label: "Google", provider: "google" },
  { label: "Facebook", provider: "facebook" },
  { label: "X", provider: "twitter" },
  { label: "Microsoft", provider: "microsoft" },
  { label: "LinkedIn", provider: "linkedin" },
]

export function SigninForm({
  callbackUrl = '/',
  enabledProviders,
}: {
  callbackUrl: string;
  enabledProviders: OAuthProviderId[];
}) {
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [isResendingVerification, setIsResendingVerification] =
    useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState<string | null>(null);
  const [activeProvider, setActiveProvider] = useState<OAuthProviderId | null>(null);
  const form = useForm<SigninSchema>({
    resolver: zodResolver(signinSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    }
  })
  const { formState: { isSubmitting } } = form;

  const handleSubmit = form.handleSubmit(async (data: SigninSchema) => {
    try {
      const { error } = await signIn.email({
        email: data.email,
        password: data.password,
        rememberMe: data.rememberMe,
        callbackURL: callbackUrl
      })
      if (error) throw error
      form.reset();
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "status" in error &&
        error.status === 403
      ) {
        setUnverifiedEmail(data.email);
        setNeedsVerification(true);
        return;
      }

      setError(
        typeof error === "object" &&
        error !== null &&
        "message" in error &&
        typeof error.message === "string"
          ? error.message
          : "Failed to sign in."
      );
    }
  });

  const continueWith = async (provider: OAuthProviderId) => {
    try {
      setActiveProvider(provider);
      setError(null);
      setMessage(null);
      const { error } = await signIn.social({
        provider,
        callbackURL: callbackUrl,
      })
      if (error) throw error;
    } catch (error) {
      setMessage(
        typeof error === "object" &&
        error !== null &&
        "message" in error &&
        typeof error.message === "string"
          ? error.message
          : `Sign in with ${providerLabel(provider)} could not start. Please try again.`,
      )
      setActiveProvider(null);
    }
  }

  const handleResendVerification = async () => {
    if (!unverifiedEmail) return;

    try {
      setIsResendingVerification(true);
      setVerificationMessage(null);

      const { error } = await sendVerificationEmail({
        email: unverifiedEmail,
        callbackURL: callbackUrl,
      });

      if (error) {
        setVerificationMessage(
          error.message ?? "Failed to resend verification email."
        );
        return;
      }

      setVerificationMessage(
        "Verification email sent successfully. Please check your inbox."
      );
    } finally {
      setIsResendingVerification(false);
    }
  };

  if (needsVerification && unverifiedEmail) {
    return (
      <div className="w-full rounded-xl border bg-card p-5 shadow-sm sm:p-7">
        <div className="flex flex-col items-center text-center py-8">
          <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Mail className="size-8 text-primary" />
          </div>

          <h2 className="text-3xl font-bold tracking-tight">
            Verify your email
          </h2>

          <p className="text-muted-foreground mt-3 max-w-md">
            We&apos;ve sent a verification link to:
          </p>

          <p className="font-medium mt-1">
            {unverifiedEmail}
          </p>

          <p className="text-muted-foreground mt-4 max-w-md">
            Please verify your email address before signing in.
            Once verified, return here and continue.
          </p>

          {verificationMessage && (
            <Alert className="mt-6 text-left max-w-md">
              <AlertTitle>
                Verification Email
              </AlertTitle>
              <AlertDescription>
                {verificationMessage}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col sm:flex-row gap-3 mt-8 w-full max-w-md">
            <Button
              className="flex-1"
              onClick={handleResendVerification}
              disabled={isResendingVerification}
            >
              {isResendingVerification
                ? "Sending..."
                : "Resend Verification Email"}
            </Button>

            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setNeedsVerification(false);
                setUnverifiedEmail(null);
                setVerificationMessage(null);
              }}
            >
              Back to Login
            </Button>
          </div>
        </div>
      </div>
    );
  }
  return (
    <>
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {message && (
        <Alert variant="destructive">
          <AlertTitle>Sign-in failed</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}
      <form onSubmit={handleSubmit} className="w-full rounded-xl border bg-card p-5 shadow-sm sm:p-7">
        <FieldGroup className="mb-6 grid gap-4 md:grid-cols-6">
          <h1 className="col-span-full text-2xl font-semibold tracking-tight sm:text-3xl">Sign in</h1>
          <p className="col-span-full text-sm text-muted-foreground">Sign in to access your account.</p>

          <Controller
            name="email"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid} className="gap-1 col-span-full">
                <FieldLabel htmlFor="email">Email </FieldLabel>
                <Input
                  {...field}
                  id="email"
                  type="email"
                  autoComplete="email"
                  onChange={(e) => {
                    field.onChange(e.target.value)
                  }}
                  aria-invalid={fieldState.invalid}
                  placeholder="Enter your Email"

                />

                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            name="password"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid} className="gap-1 col-span-full">
                <FieldLabel htmlFor="password">Password *</FieldLabel>
                <Password
                  {...field}
                  aria-invalid={fieldState.invalid}
                  id="password"
                  placeholder="Password"

                />
                <FieldContent className="flex w-full items-end justify-end">
                  <Link href="/forget-password" className="text-sm text-primary text-nowrap hover:underline">
                    Forgot password?
                  </Link>
                </FieldContent>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )} />
          <Controller
            name="rememberMe"
            control={form.control}
            render={({ field }) => (
              <Field className="gap-1 col-span-full">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="rememberMe"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                  <FieldLabel htmlFor="rememberMe">
                    Remember me
                  </FieldLabel>
                </div>
              </Field>
            )}
          />
          {enabledProviders.length > 0 && (
            <>
              <FieldSeparator className="my-4 col-span-full">Or sign in using</FieldSeparator>
              <div className="flex gap-2 justify-center w-full items-center pb-3 col-span-full">
                {socialMediaButtons
                  .filter(({ provider }) => enabledProviders.includes(provider))
                  .map(({ label, provider }) => (
                    <Button
                      key={provider}
                      variant="ghost"
                      size="icon"
                      type="button"
                      aria-label={`Continue with ${label}`}
                      title={`Continue with ${label}`}
                      className="size-10 rounded-md"
                      disabled={activeProvider !== null}
                      onClick={() => continueWith(provider)}
                    >
                      <OAuthProviderIcon provider={provider} />
                    </Button>
                  ))}
              </div>
            </>
          )}
        </FieldGroup>
        <div className="flex justify-end items-center w-full">
          <Button className="h-11 w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </Button>
        </div>
        <div className="mt-4 text-center text-sm">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-primary hover:underline">
            Sign up
          </Link>
        </div>
      </form>
    </>
  )
}

function providerLabel(provider: OAuthProviderId) {
  return socialMediaButtons.find((button) => button.provider === provider)?.label ?? provider;
}

function OAuthProviderIcon({ provider }: { provider: OAuthProviderId }) {
  switch (provider) {
    case "google":
      return (
        <svg aria-hidden="true" viewBox="0 0 48 48" className="size-5">
          <path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5.1h6.6c3.9-3.6 6.1-8.8 6.1-15Z" />
          <path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.8l-6.6-5.1c-1.8 1.2-4 2-6.9 2-5.3 0-9.8-3.6-11.4-8.4H5.8v5.3A20 20 0 0 0 24 44Z" />
          <path fill="#FBBC05" d="M12.6 27.7a12 12 0 0 1 0-7.4V15H5.8a20 20 0 0 0 0 18Z" />
          <path fill="#EA4335" d="M24 11.9c3 0 5.7 1 7.8 3.1l5.8-5.8C34.1 6 29.5 4 24 4A20 20 0 0 0 5.8 15l6.8 5.3c1.6-4.8 6.1-8.4 11.4-8.4Z" />
        </svg>
      );
    case "facebook":
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5">
          <circle cx="12" cy="12" r="11" fill="#1877F2" />
          <path fill="#fff" d="M13.5 20v-7.3H16l.4-2.8h-2.9V8.1c0-.8.2-1.3 1.4-1.3h1.6V4.3c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.5-4 4.1v1.6H7.5v2.8h2.7V20h3.3Z" />
        </svg>
      );
    case "twitter":
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5">
          <circle cx="12" cy="12" r="11" fill="currentColor" />
          <path d="m7.1 6.7 9.8 10.6h-1.9L5.2 6.7h1.9Zm-.9 10.6 5-5.7m1.7-1.9 2.8-3" fill="none" stroke="var(--background)" strokeWidth="1.7" />
        </svg>
      );
    case "microsoft":
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5">
          <path fill="#F25022" d="M2 2h9.5v9.5H2z" />
          <path fill="#7FBA00" d="M12.5 2H22v9.5h-9.5z" />
          <path fill="#00A4EF" d="M2 12.5h9.5V22H2z" />
          <path fill="#FFB900" d="M12.5 12.5H22V22h-9.5z" />
        </svg>
      );
    case "linkedin":
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5">
          <rect x="1" y="1" width="22" height="22" rx="2" fill="#0A66C2" />
          <path fill="#fff" d="M6.3 9.2h2.8v8.5H6.3V9.2Zm1.4-4.1a1.6 1.6 0 1 1 0 3.2 1.6 1.6 0 0 1 0-3.2Zm3.1 4.1h2.7v1.2h.1c.4-.7 1.3-1.5 2.7-1.5 2.9 0 3.4 1.9 3.4 4.3v4.5h-2.8v-4c0-1 0-2.3-1.4-2.3s-1.7 1.1-1.7 2.2v4.1h-2.8V9.2Z" />
        </svg>
      );
  }
}