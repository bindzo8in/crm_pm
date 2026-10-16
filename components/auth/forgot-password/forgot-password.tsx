"use client"
import { forgotPasswordSchema, ForgotPasswordSchema } from '@/lib/schemas/forgot-password-schema'
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, Controller } from "react-hook-form"
import { Field, FieldGroup, FieldLabel, FieldError } from "@/components/ui/field"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { requestPasswordReset } from "@/lib/auth-client"
import { useEffect, useState } from "react"
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card, CardContent } from '@/components/ui/card'
import { LockKeyhole, Mail } from 'lucide-react'
import Link from 'next/link'

export function ForgotPasswordForm() {
  const [error, setError] = useState<string | null>(null);
  const [submittedEmail, setSubmittedEmail] =
    useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [isResending, setIsResending] = useState(false);

  const form = useForm<ForgotPasswordSchema>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: ""
    }
  })

  const { formState: { isSubmitting } } = form;

  const handleSubmit = form.handleSubmit(async (data: ForgotPasswordSchema) => {
    setError(null);

    const { error } = await requestPasswordReset({
      email: data.email,
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      if (error.status === 429) {
        setError("Too many requests. Please try again later.");
        return;
      }
      setError(error.message ?? "An error occurred");
      return;
    }

    // Success - typically returns a generic message to prevent email enumeration
    setSubmittedEmail(data.email);
    setCooldown(60);
    form.reset();
  });

  useEffect(() => {
    if (cooldown <= 0) return;

    const timer = setTimeout(() => {
      setCooldown((remaining) => Math.max(remaining - 1, 0));
    }, 1000);

    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleResend = async () => {
    if (!submittedEmail || cooldown > 0) return;

    try {
      setError(null);
      setIsResending(true);

      const { error } = await requestPasswordReset({
        email: submittedEmail,
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        if (error.status === 429) {
          setError("Too many requests. Please try again later.");
          return;
        }

        setError(error.message ?? "Failed to resend email");
        return;
      }

      setCooldown(60);
    } finally {
      setIsResending(false);
    }
  };

  if (submittedEmail) {
    return (
      <Card className="mx-auto w-full max-w-md">
        <CardContent className="flex flex-col items-center py-10 text-center">
          <Mail className="size-12 mb-4" />

          <h2 className="text-2xl font-bold">
            Check your email
          </h2>

          <p className="text-muted-foreground mt-3">
            If an account exists for
          </p>

          <p className="font-medium">
            {submittedEmail}
          </p>

          <p className="text-muted-foreground mt-4">
            We&apos;ve sent a password reset link.
          </p>

          <p className="text-sm text-muted-foreground mt-2">
            Didn&apos;t receive the email? Check your spam folder or resend the email after the cooldown period.
          </p>

          <div className="flex flex-col sm:flex-row gap-2 mt-6 w-full">
            <Button asChild className="min-h-11 flex-1" variant="outline">
              <Link href="/signin">
                Back to sign in
              </Link>
            </Button>
            <Button
              className="min-h-11 flex-1"
              variant="outline"
              disabled={cooldown > 0 || isResending}
              onClick={handleResend}
            >
              {isResending
                ? "Sending..."
                : cooldown > 0
                  ? `Resend in ${cooldown}s`
                  : "Resend Email"}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {
        error &&
        <Alert variant={'destructive'}>
          <AlertTitle>Reset Password</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      }
      <form onSubmit={handleSubmit} className="w-full rounded-xl border bg-card p-5 shadow-sm sm:p-7">
        <FieldGroup className="grid md:grid-cols-6 gap-4 mb-6">
          <h1 className="col-span-full mt-6 mb-1 flex flex-wrap items-center gap-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
            <LockKeyhole aria-hidden="true" className="size-6 text-primary" />
            Forgot password
          </h1>
          <p className="tracking-wide text-muted-foreground mb-5 text-wrap text-sm col-span-full">Enter the email address associated with your account and we&apos;ll send you a password reset link.</p>

          <Controller
            name="email"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid} className="gap-1 col-span-full">
                <FieldLabel htmlFor="email">Email Address *</FieldLabel>
                <Input
                  {...field}
                  id="email"
                  type="email"
                  onChange={(e) => {
                    field.onChange(e.target.value)
                  }}
                  aria-invalid={fieldState.invalid}
                  placeholder="Ex. john@doe.com"

                />

                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        </FieldGroup>
        <div className="flex justify-end items-center w-full">
          <Button className="min-h-11 w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Sending...' : 'Send reset link'}
          </Button>
        </div>
      </form>
    </>
  )
}