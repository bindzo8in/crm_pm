"use client";

import { useEffect, useRef, useState } from "react";
import {
  getWebPushPublicKeyAction,
  removeWebPushSubscriptionAction,
  saveWebPushSubscriptionAction,
} from "@/actions/notifications";
import { Button } from "@/components/ui/button";
import { BellRingIcon, BellOffIcon, LoaderCircleIcon } from "lucide-react";
import { toast } from "sonner";

type PushState = "checking" | "unsupported" | "disabled" | "enabled" | "working";

function decodeApplicationServerKey(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = `${value}${padding}`.replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(window.atob(base64), (character) => character.charCodeAt(0));
}

async function waitForActiveServiceWorker(
  registration: ServiceWorkerRegistration,
): Promise<ServiceWorkerRegistration> {
  if (registration.active) return registration;

  const worker = registration.installing ?? registration.waiting;
  if (!worker) {
    throw new Error("The attendance service worker could not be started. Please try again.");
  }

  await new Promise<void>((resolve, reject) => {
    const handleStateChange = () => {
      if (worker.state === "activated") {
        worker.removeEventListener("statechange", handleStateChange);
        resolve();
      } else if (worker.state === "redundant") {
        worker.removeEventListener("statechange", handleStateChange);
        reject(new Error("The attendance service worker failed to install. Please try again."));
      }
    };

    worker.addEventListener("statechange", handleStateChange);
    handleStateChange();
  });

  if (!registration.active) {
    throw new Error("The attendance service worker is not active. Please try again.");
  }

  return registration;
}

export function AttendanceBrowserReminders() {
  const [state, setState] = useState<PushState>("checking");
  const actionInProgress = useRef(false);

  useEffect(() => {
    let active = true;
    const checkSubscription = async () => {
      if (
        !("Notification" in window) ||
        !("serviceWorker" in navigator) ||
        !("PushManager" in window)
      ) {
        if (active) setState("unsupported");
        return;
      }

      try {
        const registration = await navigator.serviceWorker.getRegistration("/");
        const subscription = await registration?.pushManager.getSubscription();
        if (active) {
          setState(subscription ? "enabled" : "disabled");
        }
      } catch (error: unknown) {
        console.error("Could not check browser notification subscription:", error);
        if (active) setState("disabled");
      }
    };

    void checkSubscription();
    return () => {
      active = false;
    };
  }, []);

  const enableReminders = async () => {
    if (actionInProgress.current) return;
    actionInProgress.current = true;
    setState("working");
    try {
      const { publicKey } = await getWebPushPublicKeyAction();
      if (!publicKey) {
        throw new Error("Browser reminders are not configured on this server yet.");
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        throw new Error(
          permission === "denied"
            ? "Browser notifications are blocked for this site. Allow them in your browser's site settings, then try again."
            : "Notification permission was not granted. Allow browser notifications when prompted, then try again.",
        );
      }

      const registration = await navigator.serviceWorker.register(
        "/attendance-service-worker.js",
      );
      const activeRegistration = await waitForActiveServiceWorker(registration);
      const subscription = await activeRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: decodeApplicationServerKey(publicKey),
      });

      await saveWebPushSubscriptionAction(subscription.toJSON());
      setState("enabled");
      toast.success("Browser attendance reminders enabled.");
    } catch (error: unknown) {
      setState("disabled");
      toast.error(
        error instanceof Error ? error.message : "Could not enable browser reminders.",
        { id: "attendance-browser-reminder-enable" },
      );
    } finally {
      actionInProgress.current = false;
    }
  };

  const disableReminders = async () => {
    if (actionInProgress.current) return;
    actionInProgress.current = true;
    setState("working");
    let browserSubscriptionRemoved = false;
    try {
      const registration = await navigator.serviceWorker.getRegistration("/");
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
        browserSubscriptionRemoved = true;
        await removeWebPushSubscriptionAction({ endpoint: subscription.endpoint });
      }
      setState("disabled");
      toast.success("Browser attendance reminders disabled.");
    } catch (error: unknown) {
      setState(browserSubscriptionRemoved ? "disabled" : "enabled");
      toast.error(error instanceof Error ? error.message : "Could not disable browser reminders.");
    } finally {
      actionInProgress.current = false;
    }
  };

  if (state === "unsupported") {
    return (
      <p className="text-xs text-muted-foreground">
        Browser notifications are not supported by this browser.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <BellRingIcon className="mt-0.5 size-4 shrink-0 text-primary" />
        <div className="space-y-1">
          <h2 className="text-sm font-semibold">Attendance reminders on this browser</h2>
          <p className="text-xs text-muted-foreground">
            Enable browser notifications to receive a reminder at the time set by your administrator.
          </p>
        </div>
      </div>
      {state === "enabled" ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={disableReminders}
        >
          <BellOffIcon className="size-4" />
          Turn off
        </Button>
      ) : (
        <Button
          type="button"
          size="sm"
          onClick={enableReminders}
          disabled={state === "working" || state === "checking"}
        >
          {state === "working" || state === "checking" ? (
            <LoaderCircleIcon className="size-4 animate-spin" />
          ) : (
            <BellRingIcon className="size-4" />
          )}
          {state === "working"
            ? "Updating..."
            : state === "checking"
              ? "Checking..."
              : "Enable browser reminders"}
        </Button>
      )}
    </div>
  );
}
