"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  KeyRound,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from "lucide-react";
import {
  lockSalaryPinSessionAction,
  refreshSalaryPinSessionAction,
  requestSalaryPinResetAction,
  setupSalaryPinAction,
  verifySalaryPinAction,
} from "@/actions/salary-pin";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

const inactivityTimeoutMs = 5 * 60 * 1000;
const sessionRefreshIntervalMs = 30 * 1000;

type SalaryPinGateProps = {
  isConfigured: boolean;
  isUnlocked: boolean;
  email: string;
  children?: ReactNode;
};

export function SalaryPinGate({
  isConfigured,
  isUnlocked: initialUnlocked,
  email,
  children,
}: SalaryPinGateProps) {
  const router = useRouter();
  const [isLocallyLocked, setIsLocallyLocked] = useState(false);
  const isUnlocked = initialUnlocked && !isLocallyLocked;
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isUnlocked) {
      return;
    }

    let lastServerRefresh = Date.now();
    let inactivityTimer: ReturnType<typeof setTimeout>;

    const lock = async () => {
      setIsLocallyLocked(true);
      setPin("");
      try {
        await lockSalaryPinSessionAction();
      } catch {
        setError("The session could not be locked. Reload this page before continuing.");
      } finally {
        router.refresh();
      }
    };

    const resetInactivityTimer = () => {
      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        void lock();
      }, inactivityTimeoutMs);
    };

    const recordActivity = () => {
      resetInactivityTimer();
      if (Date.now() - lastServerRefresh < sessionRefreshIntervalMs) {
        return;
      }

      lastServerRefresh = Date.now();
      void refreshSalaryPinSessionAction().then((result) => {
        if (!result.success) {
          void lock();
        }
      }).catch(() => {
        void lock();
      });
    };

    const activityEvents: (keyof WindowEventMap)[] = [
      "pointerdown",
      "keydown",
      "mousemove",
      "touchstart",
      "scroll",
    ];
    activityEvents.forEach((event) =>
      window.addEventListener(event, recordActivity, { passive: true }),
    );
    resetInactivityTimer();

    return () => {
      clearTimeout(inactivityTimer);
      activityEvents.forEach((event) =>
        window.removeEventListener(event, recordActivity),
      );
    };
  }, [isUnlocked, router]);

  const submitPin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setIsSubmitting(true);

    try {
      const result = isConfigured
        ? await verifySalaryPinAction(pin)
        : await setupSalaryPinAction(pin);
      if (!result.success) {
        setError(result.error ?? "PIN verification failed. Try again.");
        return;
      }
      setPin("");
      router.refresh();
    } catch {
      setError("The request could not be completed. Check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const requestReset = async () => {
    setError(null);
    setNotice(null);
    setIsSubmitting(true);
    try {
      const result = await requestSalaryPinResetAction();
      if (!result.success) {
        setError(result.error ?? "Could not request a reset link.");
        return;
      }
      setNotice(result.message ?? "If your PIN is set, a reset link will be sent.");
    } catch {
      setError("The reset email could not be requested. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isUnlocked) {
    return <>{children}</>;
  }

  return (
    <section className="mx-auto w-full max-w-5xl py-6 sm:py-10">
      <div className="grid overflow-hidden rounded-2xl border bg-card shadow-sm md:grid-cols-[0.9fr_1.1fr]">
        <aside className="relative flex min-h-64 flex-col justify-between overflow-hidden bg-[#211747] p-6 text-white sm:p-8 md:min-h-[430px]">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full border border-white/10"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-5 -top-9 size-44 rounded-full border border-white/10"
          />
          <div className="relative">
            <div className="flex size-12 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-violet-100">
              <ShieldCheck aria-hidden="true" className="size-6" />
            </div>
            <p className="mt-8 text-sm font-medium text-violet-200">
              Confidential payroll
            </p>
            <h2 className="mt-2 max-w-xs text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">
              {isConfigured ? "Your payroll workspace is locked." : "Protect payroll before you begin."}
            </h2>
            <p className="mt-3 max-w-sm text-sm leading-6 text-violet-100/75">
              {isConfigured
                ? "Enter your personal PIN to continue to salary details and payment records."
                : "Create a personal six-digit PIN. It adds a second layer of protection to salary details."}
            </p>
          </div>

          <div className="relative mt-8 space-y-3 border-t border-white/15 pt-5 text-sm text-violet-100/85">
            <p className="flex items-center gap-2.5">
              <Clock3 aria-hidden="true" className="size-4 text-violet-200" />
              Locks after 5 minutes without activity
            </p>
            <p className="flex items-center gap-2.5">
              <LockKeyhole aria-hidden="true" className="size-4 text-violet-200" />
              Locked again when this browser closes
            </p>
          </div>
        </aside>

        <div className="flex flex-col justify-center p-6 sm:p-9 md:p-10">
          <div className="mb-7">
            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              {isConfigured ? (
                <LockKeyhole aria-hidden="true" className="size-4" />
              ) : (
                <KeyRound aria-hidden="true" className="size-4" />
              )}
              {isConfigured ? "PIN required" : "One-time setup"}
            </div>
            <h3 className="mt-3 text-xl font-semibold tracking-tight sm:text-2xl">
              {isConfigured ? "Enter your PIN" : "Choose your six-digit PIN"}
            </h3>
            <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              {isConfigured
                ? "Use the PIN you created for Salary Management."
                : "This PIN is separate from your sign-in password."}
            </p>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-5">
              <AlertCircle aria-hidden="true" className="size-4" />
              <AlertTitle>PIN not accepted</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {notice && (
            <Alert className="mb-5">
              <CheckCircle2 aria-hidden="true" className="size-4" />
              <AlertTitle>Check your email</AlertTitle>
              <AlertDescription>{notice}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={submitPin} className="space-y-6">
            <div className="space-y-3">
              <label className="text-sm font-medium" htmlFor="salary-pin">
                Six-digit PIN
              </label>
              <InputOTP
                autoComplete="one-time-code"
                autoFocus
                aria-label="Six-digit salary PIN"
                aria-invalid={Boolean(error)}
                id="salary-pin"
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
              <p className="text-xs leading-5 text-muted-foreground">
                {isConfigured
                  ? `Reset links go to ${email}.`
                  : "Choose a PIN you do not use anywhere else."}
              </p>
            </div>

            <Button
              className="min-h-12 w-full"
              disabled={isSubmitting || pin.length !== 6}
            >
              {isSubmitting
                ? "Please wait..."
                : isConfigured
                  ? "Unlock salary management"
                  : "Save PIN and continue"}
            </Button>
          </form>

          {isConfigured && (
            <div className="mt-6 border-t pt-5">
              <p className="text-sm text-muted-foreground">
                Forgot your PIN?{" "}
                <button
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={isSubmitting}
                  onClick={requestReset}
                  type="button"
                >
                  <Mail aria-hidden="true" className="size-4" />
                  Send a reset link
                </button>
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
