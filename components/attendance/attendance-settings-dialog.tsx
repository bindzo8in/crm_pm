"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateAttendanceSettingsAction } from "@/actions/attendance";
import { AlertCircleIcon, BellRingIcon, CheckCircle2Icon, ChevronDownIcon, Clock3, MapPin, RefreshCwIcon, Settings2Icon } from "lucide-react";
import { toast } from "sonner";
import { AttendanceBrowserReminders } from "./attendance-browser-reminders";

interface AttendanceSettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  settings: any;
  canManageShiftRules: boolean;
  canManageReminderTime: boolean;
  onSuccess: () => void;
}

export function AttendanceSettingsDialog({
  isOpen,
  onClose,
  settings,
  canManageShiftRules,
  canManageReminderTime,
  onSuccess,
}: AttendanceSettingsDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90dvh] w-[calc(100%-1rem)] max-w-2xl gap-0 overflow-x-hidden overflow-y-auto p-0 sm:w-[calc(100%-2rem)]">
        <DialogHeader className="sticky top-0 z-10 min-w-0 border-b bg-popover px-4 py-4 pr-12 sm:px-6">
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
            <Settings2Icon aria-hidden="true" className="size-5 text-primary" />
            Attendance settings
          </DialogTitle>
          <DialogDescription>
            Manage browser alerts and shift rules.
          </DialogDescription>
        </DialogHeader>

        <div className="min-w-0 max-w-full space-y-6 p-4 sm:p-6">
          <section aria-labelledby="browser-alerts-title" className="space-y-3 border-t border-border/60 pt-5">
            <div className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <BellRingIcon aria-hidden="true" className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <h3 id="browser-alerts-title" className="font-medium">Browser alerts</h3>
                <p className="text-sm text-muted-foreground">
                  Receive attendance reminders and holiday announcements in this browser.
                </p>
              </div>
              <AttendanceBrowserReminders />
            </div>
          </section>

          <section aria-labelledby="shift-rules-title" className="space-y-3 border-t border-border/60 pt-5">
            <div className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Clock3 aria-hidden="true" className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <h3 id="shift-rules-title" className="font-medium">Shift rules</h3>
                <p className="text-sm text-muted-foreground">
                  {canManageShiftRules
                    ? "Manage shift times, grace period, and office geofence."
                    : `Expected shift: ${settings?.expectedClockIn || "09:00"} – ${settings?.expectedClockOut || "18:00"}`}
                </p>
              </div>
            </div>
            {canManageShiftRules ? (
              <details
                className="border-t border-border/60 pt-3"
                open={!settings?.isConfigured}
              >
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-lg px-2 text-sm font-medium outline-none hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
                  <span>{settings?.isConfigured ? "Edit shift and office rules" : "Complete shift setup"}</span>
                  <ChevronDownIcon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
                </summary>
                <div className="pt-3">
                  <AttendanceSettingsForm
                    onClose={onClose}
                    settings={settings}
                    canManageReminderTime={canManageReminderTime}
                    onSuccess={onSuccess}
                  />
                </div>
              </details>
            ) : (
              <div className="flex items-start gap-2 text-xs text-muted-foreground">
                <AlertCircleIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                <p>Only attendance administrators can change shift rules.</p>
              </div>
            )}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface AttendanceSettingsFormProps {
  onClose: () => void;
  settings: any;
  canManageReminderTime: boolean;
  onSuccess: () => void;
}

function AttendanceSettingsForm({ onClose, settings, canManageReminderTime, onSuccess }: AttendanceSettingsFormProps) {
  const [expectedClockIn, setExpectedClockIn] = useState(settings?.expectedClockIn || "09:00");
  const [expectedClockOut, setExpectedClockOut] = useState(settings?.expectedClockOut || "18:00");
  const [attendanceReminderTime, setAttendanceReminderTime] = useState(settings?.attendanceReminderTime || "08:30");
  const [gracePeriodMinutes, setGracePeriodMinutes] = useState<number>(settings?.gracePeriodMinutes ?? 15);
  const [halfDayThresholdMinutes, setHalfDayThresholdMinutes] = useState<number>(settings?.halfDayThresholdMinutes ?? 240);
  const [maxShiftHoursCap, setMaxShiftHoursCap] = useState<number>(settings?.maxShiftHoursCap ?? 16);
  
  const [officeLatitude, setOfficeLatitude] = useState<string>(
    settings?.officeLatitude != null ? String(settings.officeLatitude) : ""
  );
  const [officeLongitude, setOfficeLongitude] = useState<string>(
    settings?.officeLongitude != null ? String(settings.officeLongitude) : ""
  );
  const [officeRadiusMeters, setOfficeRadiusMeters] = useState<number>(settings?.officeRadiusMeters ?? 500);
  const [enforceOfficeGeofence, setEnforceOfficeGeofence] = useState<boolean>(settings?.enforceOfficeGeofence ?? true);

  const [loading, setLoading] = useState(false);
  const [fetchingLoc, setFetchingLoc] = useState(false);

  const handleUseCurrentLocation = () => {
    if (typeof window !== "undefined" && "geolocation" in navigator) {
      setFetchingLoc(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setOfficeLatitude(pos.coords.latitude.toFixed(6));
          setOfficeLongitude(pos.coords.longitude.toFixed(6));
          setFetchingLoc(false);
          toast.success("Office location populated from current GPS coordinates!");
        },
        (err) => {
          setFetchingLoc(false);
          toast.error("Failed to get current location: " + err.message);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      toast.error("Geolocation is not supported by your browser.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const parsedLat = officeLatitude.trim() ? parseFloat(officeLatitude) : null;
      const parsedLng = officeLongitude.trim() ? parseFloat(officeLongitude) : null;

      const res = await updateAttendanceSettingsAction({
        expectedClockIn,
        expectedClockOut,
        ...(canManageReminderTime ? { attendanceReminderTime } : {}),
        gracePeriodMinutes: Number(gracePeriodMinutes),
        halfDayThresholdMinutes: Number(halfDayThresholdMinutes),
        maxShiftHoursCap: Number(maxShiftHoursCap),
        allowOvernightShift: true,
        officeLatitude: parsedLat,
        officeLongitude: parsedLng,
        officeRadiusMeters: Number(officeRadiusMeters),
        enforceOfficeGeofence,
      });

      if (!res.success) {
        toast.error(res.error || "Failed to update settings");
        return;
      }

      toast.success("Attendance rules & office location saved!");
      onSuccess();
      onClose();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to update settings");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Shift Hours */}
          <div className="space-y-3 p-3 bg-muted/30 rounded-2xl border border-border/50">
            <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Clock3 aria-hidden="true" className="size-4 text-muted-foreground" />
              Shift schedule and grace rules
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold">Expected Start (HH:mm)</Label>
                <Input
                  type="text"
                  placeholder="09:00"
                  value={expectedClockIn}
                  onChange={(e) => setExpectedClockIn(e.target.value)}
                  className="rounded-xl text-xs h-9"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold">Expected End (HH:mm)</Label>
                <Input
                  type="text"
                  placeholder="18:00"
                  value={expectedClockOut}
                  onChange={(e) => setExpectedClockOut(e.target.value)}
                  className="rounded-xl text-xs h-9"
                  required
                />
              </div>
            </div>

            {canManageReminderTime && (
              <div className="space-y-1">
                <Label htmlFor="attendance-reminder-time" className="text-[11px] font-semibold">
                  Attendance reminder time (IST)
                </Label>
                <Input
                  id="attendance-reminder-time"
                  type="time"
                  value={attendanceReminderTime}
                  onChange={(event) => setAttendanceReminderTime(event.target.value)}
                  className="h-9 rounded-xl text-xs"
                  required
                />
                <p className="text-[11px] text-muted-foreground">
                  Sent before the expected shift start. Weekends, holidays, approved leave, and employees already checked in are skipped.
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold">Grace Period (Mins)</Label>
                <Input
                  type="number"
                  value={gracePeriodMinutes}
                  onChange={(e) => setGracePeriodMinutes(Number(e.target.value))}
                  className="rounded-xl text-xs h-9"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold">Min Login Mins for Full Day</Label>
                <Input
                  type="number"
                  placeholder="240"
                  value={halfDayThresholdMinutes}
                  onChange={(e) => setHalfDayThresholdMinutes(Number(e.target.value))}
                  className="rounded-xl text-xs h-9"
                  required
                />
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Working less than {halfDayThresholdMinutes} minutes ({Math.round(halfDayThresholdMinutes / 60)} hrs) automatically marks the attendance record as <strong>HALF DAY</strong>.
            </p>

            <div className="space-y-1">
              <Label className="text-[11px] font-semibold">Max Shift Hours Cap (Auto-Checkout)</Label>
              <Input
                type="number"
                value={maxShiftHoursCap}
                onChange={(e) => setMaxShiftHoursCap(Number(e.target.value))}
                className="rounded-xl text-xs h-9"
                required
              />
            </div>
          </div>

          {/* Office Geofencing Section */}
          <div className="space-y-3 p-3 bg-primary/5 rounded-2xl border border-primary/20">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <MapPin aria-hidden="true" className="size-4 text-muted-foreground" />
                Office location and geofence rule
              </h4>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleUseCurrentLocation}
                disabled={fetchingLoc}
                className="text-[11px] text-primary h-7 px-2"
              >
                {fetchingLoc ? "Locating..." : "Use Current GPS"}
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold">Office Latitude</Label>
                <Input
                  type="text"
                  placeholder="e.g. 28.6139"
                  value={officeLatitude}
                  onChange={(e) => setOfficeLatitude(e.target.value)}
                  className="rounded-xl text-xs h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold">Office Longitude</Label>
                <Input
                  type="text"
                  placeholder="e.g. 77.2090"
                  value={officeLongitude}
                  onChange={(e) => setOfficeLongitude(e.target.value)}
                  className="rounded-xl text-xs h-9"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 items-center">
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold">Max Office Radius (Meters)</Label>
                <Input
                  type="number"
                  placeholder="500"
                  value={officeRadiusMeters}
                  onChange={(e) => setOfficeRadiusMeters(Number(e.target.value))}
                  className="rounded-xl text-xs h-9"
                  required
                />
              </div>
              <div className="flex items-center gap-2 pt-4">
                <input
                  type="checkbox"
                  id="enforceGeofence"
                  checked={enforceOfficeGeofence}
                  onChange={(e) => setEnforceOfficeGeofence(e.target.checked)}
                  className="w-4 h-4 rounded text-primary border-border accent-primary cursor-pointer"
                />
                <Label htmlFor="enforceGeofence" className="text-xs font-medium cursor-pointer">
                  Enforce Range Check for Office Mode
                </Label>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground">
              When checked, employees clocking in with <strong>OFFICE</strong> mode must be within {officeRadiusMeters} meters of the office coordinates.
            </p>
          </div>

          <DialogFooter className="flex items-center justify-between gap-3 pt-3">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading} className="w-full rounded-xl">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="w-full rounded-xl font-semibold">
              {loading ? (
                <>
                  <RefreshCwIcon className="w-4 h-4 mr-2 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <CheckCircle2Icon className="w-4 h-4 mr-2" /> Save Settings
                </>
              )}
            </Button>
          </DialogFooter>
    </form>
  );
}
