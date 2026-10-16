"use client"
import { SigninSchema, signinSchema } from '@/lib/schemas/signin-schema'
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, Controller } from "react-hook-form"
import { Globe, Mail } from "lucide-react"
import { Field, FieldGroup, FieldContent, FieldLabel, FieldError, FieldSeparator } from "@/components/ui/field"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Password } from "@/components/password"
import { sendVerificationEmail, signIn } from "@/lib/auth-client"
import { useState } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import Link from "next/link"

const socialMediaButtons = [
  { label: "Continue with Google", provider: "google" as const },
]

export function SigninForm({ callbackUrl = '/' }: { callbackUrl: string }) {
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [isResendingVerification, setIsResendingVerification] =
    useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState<string | null>(null);
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

  const continueWith = async ({ provider }: { provider: "google" }) => {
    try {
      await signIn.social({
        provider,
        callbackURL: callbackUrl,
      })
    } catch {
      setMessage(`Sign in with ${provider} could not start. Please try again.`)
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
          <FieldSeparator className="my-4 col-span-full">OR</FieldSeparator>
          <div className="flex gap-3 justify-center w-full items-center flex-wrap pb-3 col-span-full">
            {socialMediaButtons.map((o) => (
              <Button key={o.label} variant="outline" type="button"
                className="text-sm gap-2 px-2 h-10 grow "
                onClick={() => {
                  continueWith({ provider: o.provider });
                }}
              >
                <Globe aria-hidden="true" className="size-4" />
                {o.label}
              </Button>
            ))}
          </div>
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