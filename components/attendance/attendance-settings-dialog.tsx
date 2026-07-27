"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateAttendanceSettingsAction } from "@/actions/attendance";
import { Settings2Icon, RefreshCwIcon, CheckCircle2Icon, ShieldAlertIcon } from "lucide-react";
import { toast } from "sonner";

interface AttendanceSettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  settings: any;
  onSuccess: () => void;
}

export function AttendanceSettingsDialog({ isOpen, onClose, settings, onSuccess }: AttendanceSettingsDialogProps) {
  const [expectedClockIn, setExpectedClockIn] = useState(settings?.expectedClockIn || "09:00");
  const [expectedClockOut, setExpectedClockOut] = useState(settings?.expectedClockOut || "18:00");
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
    } catch (err: any) {
      toast.error(err.message || "Failed to update settings");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg bg-background border-border p-6 rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <Settings2Icon className="w-5 h-5 text-primary" /> Shift Rules & Geofence Settings
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Configure shift timings, office location coordinates, allowed radius, and auto-checkout cap.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Shift Hours */}
          <div className="space-y-3 p-3 bg-muted/30 rounded-2xl border border-border/50">
            <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
              ⏱️ Shift Schedule & Grace Rules
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
                📍 Office Location & Geofence Rule
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
      </DialogContent>
    </Dialog>
  );
}
