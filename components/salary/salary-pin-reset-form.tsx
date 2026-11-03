"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2, KeyRound } from "lucide-react";
import { completeSalaryPinResetAction } from "@/actions/salary-pin";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

export function SalaryPinResetForm({ token }: { token: string }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const result = await completeSalaryPinResetAction({ token, pin });
      if (!result.success) {
        setError(result.error ?? "The reset link could not be used.");
        return;
      }
      setIsComplete(true);
      setPin("");
    } catch {
      setError("The request could not be completed. Check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isComplete) {
    return (
      <Card className="mx-auto w-full max-w-md">
        <CardContent className="flex flex-col items-center py-10 text-center">
          <CheckCircle2 aria-hidden="true" className="mb-4 size-12 text-green-600" />
          <h1 className="text-2xl font-semibold">Salary PIN updated</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Your new PIN is ready. Return to Salary Management and enter it to unlock payroll.
          </p>
          <Button asChild className="mt-6 min-h-11 w-full">
            <Link href="/dashboard/salary">Return to salary management</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <section className="mx-auto w-full max-w-5xl py-8 sm:py-12">
      <div className="grid overflow-hidden rounded-2xl border bg-card shadow-sm md:grid-cols-[0.9fr_1.1fr]">
        <aside className="flex min-h-56 flex-col justify-between bg-[#211747] p-6 text-white sm:p-8 md:min-h-[390px]">
          <div>
            <div className="flex size-12 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-violet-100">
              <KeyRound aria-hidden="true" className="size-6" />
            </div>
            <p className="mt-8 text-sm font-medium text-violet-200">
              Account security
            </p>
            <h1 className="mt-2 max-w-xs text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">
              Reset your payroll PIN.
            </h1>
            <p className="mt-3 max-w-sm text-sm leading-6 text-violet-100/75">
              This changes only the PIN used for Salary Management. Your account password stays the same.
            </p>
          </div>
          <p className="mt-8 border-t border-white/15 pt-5 text-sm text-violet-100/85">
            This link expires after 30 minutes and works once.
          </p>
        </aside>

        <div className="flex flex-col justify-center p-6 sm:p-9 md:p-10">
          <div className="mb-7">
            <p className="text-sm font-medium text-primary">New PIN</p>
            <h2 className="mt-3 text-xl font-semibold tracking-tight sm:text-2xl">
              Choose six digits
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Use a PIN you do not use anywhere else.
            </p>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-5">
              <AlertCircle aria-hidden="true" className="size-4" />
              <AlertTitle>Could not reset PIN</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form className="space-y-6" onSubmit={submit}>
            <div className="space-y-3">
              <label className="text-sm font-medium" htmlFor="new-salary-pin">
                New six-digit PIN
              </label>
              <InputOTP
                autoComplete="one-time-code"
                autoFocus
                aria-label="New six-digit salary PIN"
                aria-invalid={Boolean(error)}
                id="new-salary-pin"
                inputMode="numeric"
                maxLength={6}
                onChange={(value) => {
                  setPin(value);
                  if (error) setError(null);
                }}
                pattern="[0-9]*"
                required
                type="password"
                value={pin}
                containerClassName="w-full"
                className="!text-transparent"
              >
                <InputOTPGroup className="w-full justify-between gap-2 rounded-none">
                  {Array.from({ length: 6 }, (_, index) => (
                    <InputOTPSlot
                      key={index}
                      index={index}
                      mask
                      className="size-12 flex-1 rounded-xl border bg-muted/30 text-base font-semibold shadow-none first:border last:border sm:size-14"
                    />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>
            <Button className="min-h-12 w-full" disabled={isSubmitting || pin.length !== 6}>
              {isSubmitting ? "Updating PIN..." : "Update salary PIN"}
            </Button>
          </form>
        </div>
      </div>
    </section>
  );
}
