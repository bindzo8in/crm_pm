"use client"
import { signupSchema, SignupSchemaType } from '@/lib/schemas/signup-schema'
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, Controller } from "react-hook-form"
import { AlertCircle, Globe } from "lucide-react"
import { Field, FieldGroup, FieldContent, FieldLabel, FieldError, FieldSeparator } from "@/components/ui/field"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Password } from "@/components/password"
import { Checkbox } from "@/components/ui/checkbox"
import { signUp, signIn, sendVerificationEmail } from '@/lib/auth-client'
import { useState } from 'react'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import Link from "next/link"

const socialMediaButtons = [
  { label: "Continue with Google", provider: "google" as const },
]

function shouldResendVerificationEmail(createdAt: Date | string): boolean {
  return Date.now() - new Date(createdAt).getTime() > 10_000;
}

export function SignupForm() {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<SignupSchemaType>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: "",
      name: "",
      password: "",
      "confirm-password": "",
    }
  })

  const handleSubmit = form.handleSubmit(async (data) => {
    try {
      setIsLoading(true);
      setError(null);
      setMessage(null);

      const { data: signUpData, error: signUpError } = await signUp.email({
        email: data.email,
        password: data.password,
        name: data.name,
        callbackURL: window.location.origin
      });
      if (signUpError) {
        setError("We could not create your account. Please try again.");
        return;
      }

      if (signUpData?.user?.emailVerified === false) {
        if (shouldResendVerificationEmail(signUpData.user.createdAt)) {
          const { error: verifyError } = await sendVerificationEmail({ email: data.email })
          if (verifyError) {
            setError("We could not send a verification email. Try signing in to request another.");
            return;
          }
        }
      }


      setMessage(
        `If this email is not already registered, an account has been created. Please check your inbox for verification.`
      );

      form.reset();
    } catch {
      setError("We could not create your account. Please try again.");
    } finally {
      setIsLoading(false);
    }
  });

  const continueWith = async ({ provider }: { provider: "google" }) => {
    try {
      await signIn.social({
        provider,
        callbackURL: "/"
      })
    } catch {
      setError(`Sign in with ${provider} could not start. Please try again.`)
    }
  }

  return (
    <>
      {message && (
        <Alert variant="default">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>
            {message}
          </AlertDescription>
        </Alert>
      )}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
      )}
      <form onSubmit={handleSubmit} className="w-full rounded-xl border bg-card p-5 shadow-sm sm:p-7">
        <FieldGroup className="mb-6 grid gap-4 md:grid-cols-6">
          <h1 className="col-span-full text-2xl font-semibold tracking-tight sm:text-3xl">Create an account</h1>
          <p className="col-span-full text-sm text-muted-foreground">Register to get started.</p>

          <Controller
            name="name"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid} className="gap-1 col-span-full">
                <FieldLabel htmlFor="name">Your Name *</FieldLabel>
                <Input
                  {...field}
                  id="name"
                  type="email"
                  autoComplete="email"
                  onChange={(e) => {
                    field.onChange(e.target.value)
                  }}
                  aria-invalid={fieldState.invalid}
                  placeholder="Enter your Name"

                />

                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            name="email"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid} className="gap-1 col-span-full">
                <FieldLabel htmlFor="email">Email *</FieldLabel>
                <Input
                  {...field}
                  id="email"
                  type="text"
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
              <Field data-invalid={fieldState.invalid} className="gap-1 col-span-full md:col-span-3">
                <FieldContent className="gap-0.5">
                  <FieldLabel htmlFor="password">Password *</FieldLabel>

                </FieldContent>
                <Password
                  {...field}
                  aria-invalid={fieldState.invalid}
                  id="password"
                  placeholder="Password"

                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )} />

          <Controller
            name="confirm-password"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid} className="gap-1 col-span-full md:col-span-3">
                <FieldContent className="gap-0.5">
                  <FieldLabel htmlFor="confirm-password">Confirm Password *</FieldLabel>

                </FieldContent>
                <Password
                  {...field}
                  aria-invalid={fieldState.invalid}
                  id="confirm-password"
                  placeholder="Confirm Password"

                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )} />
          <FieldSeparator className="my-4 col-span-full">OR</FieldSeparator>
          <div className="flex gap-3 justify-center w-full items-center flex-wrap pb-3 col-span-full">
            {socialMediaButtons.map((o) => (
              <Button key={o.label} variant="outline" type="button"
                className="text-sm gap-2 px-2 h-10 grow "
                onClick={() => { continueWith({ provider: o.provider }) }}
              >
                <Globe aria-hidden="true" className="size-4" />
                {o.label}
              </Button>
            ))}
          </div>
          <Controller
            name="agree"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid} className="gap-1 col-span-full">
                <div className="flex items-center gap-2 mb-1">
                  <Checkbox
                    id="agree"
                    checked={field.value ?? false}
                    onCheckedChange={field.onChange}
                    aria-invalid={fieldState.invalid}

                  />
                  <FieldLabel htmlFor="agree">I agree to the terms and conditions *</FieldLabel>

                </div>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        </FieldGroup>
        <div className="flex justify-end items-center w-full">
          <Button className="h-11 w-full" disabled={isLoading}>
            {isLoading ? 'Creating account...' : 'Create account'}
          </Button>
        </div>
        <div className="mt-4 text-center text-sm">
          Already have an account?{" "}
          <Link href="/signin" className="text-primary hover:underline">
            Sign in
          </Link>
        </div>
      </form>
    </>
  )
}