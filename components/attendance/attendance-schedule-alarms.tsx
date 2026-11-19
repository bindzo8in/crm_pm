"use client";

import { useEffect, useState } from "react";
import {
  getAttendanceAlarmPreferencesAction,
  updateAttendanceAlarmPreferencesAction,
} from "@/actions/attendance";
import { toast } from "sonner";

interface AlarmPreferences {
  clockInEnabled: boolean;
  clockOutEnabled: boolean;
}

type AlarmPreferenceKey = keyof AlarmPreferences;

export function AttendanceScheduleAlarms() {
  const [preferences, setPreferences] = useState<AlarmPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;

    getAttendanceAlarmPreferencesAction()
      .then((result) => {
        if (active) setPreferences(result);
      })
      .catch((error: unknown) => {
        console.error("Could not load attendance alarm preferences:", error);
        if (active) {
          toast.error(
            error instanceof Error
              ? error.message
              : "Could not load attendance alarm preferences.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const updatePreference = async (
    key: AlarmPreferenceKey,
    enabled: boolean,
  ) => {
    if (!preferences || saving) return;

    setSaving(true);
    try {
      const updated = await updateAttendanceAlarmPreferencesAction({
        ...preferences,
        [key]: enabled,
      });
      setPreferences(updated);
      toast.success("Alarm preference saved.");
    } catch (error: unknown) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not save alarm preference.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <section
      aria-labelledby="attendance-schedule-alarms-title"
      className="space-y-3 border-t border-border/60 pt-5"
    >
      <div>
        <h3 id="attendance-schedule-alarms-title" className="font-medium">
          Optional shift alarms
        </h3>
        <p className="text-sm text-muted-foreground">
          Get a push notification at the configured shift time. Enable browser
          alerts above on each device where you want to receive alarms.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex min-h-11 items-center gap-2 rounded-lg border border-border/70 px-3">
          <input
            type="checkbox"
            checked={preferences?.clockInEnabled ?? false}
            disabled={loading || saving || !preferences}
            onChange={(event) =>
              void updatePreference("clockInEnabled", event.target.checked)
            }
            className="size-4 accent-primary"
          />
          <span className="cursor-pointer text-sm font-medium">Clock-in alarm</span>
        </label>
        <label className="flex min-h-11 items-center gap-2 rounded-lg border border-border/70 px-3">
          <input
            type="checkbox"
            checked={preferences?.clockOutEnabled ?? false}
            disabled={loading || saving || !preferences}
            onChange={(event) =>
              void updatePreference("clockOutEnabled", event.target.checked)
            }
            className="size-4 accent-primary"
          />
          <span className="cursor-pointer text-sm font-medium">Clock-out alarm</span>
        </label>
      </div>
      <p className="text-xs text-muted-foreground">
        A clock-out reminder also appears in the app if you are still clocked in.
        Push delivery depends on your browser and device notification settings.
      </p>
    </section>
  );
}
