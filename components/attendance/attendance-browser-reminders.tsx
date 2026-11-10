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

function getEnableErrorMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return "Could not enable browser reminders. Please try again.";
  }

  if (
    Notification.permission === "granted" &&
    /registration failed.*permission denied/i.test(error.message)
  ) {
    return "This browser context does not allow push subscriptions (common in private/incognito windows). Open localhost:3000 in a normal browser window and enable notifications there.";
  }

  return error.message;
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
      toast.success("Browser notifications enabled.");
    } catch (error: unknown) {
      setState("disabled");
      toast.error(
        getEnableErrorMessage(error),
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
      toast.success("Browser notifications disabled.");
    } catch (error: unknown) {
      setState(browserSubscriptionRemoved ? "disabled" : "enabled");
      toast.error(error instanceof Error ? error.message : "Could not disable browser reminders.");
    } finally {
      actionInProgress.current = false;
    }
  };

  const isEnabled = state === "enabled";
  const isBusy = state === "working" || state === "checking";
  const isUnsupported = state === "unsupported";
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className="h-9 rounded-full border-border/80 px-3 text-xs font-semibold shadow-sm"
      aria-label={
        isUnsupported
          ? "Browser notifications are not supported"
          : isEnabled
            ? "Turn off browser notifications"
            : "Enable browser notifications"
      }
      aria-pressed={isEnabled}
      title={
        isUnsupported
          ? "Browser notifications are not supported by this browser."
          : "Receive attendance reminders and holiday announcements in this browser."
      }
      disabled={isBusy || isUnsupported}
      onClick={() => {
        if (isEnabled) {
          void disableReminders();
        } else {
          void enableReminders();
        }
      }}
    >
      {isBusy ? (
        <LoaderCircleIcon className="size-4 animate-spin" />
      ) : isUnsupported ? (
        <BellOffIcon className="size-4" />
      ) : (
        <BellRingIcon className="size-4" />
      )}
      {state === "working"
        ? "Updating"
        : state === "checking"
          ? "Checking"
          : isUnsupported
            ? "Unsupported"
            : isEnabled
              ? "Alerts on"
              : "Enable alerts"}
    </Button>
  );
}
