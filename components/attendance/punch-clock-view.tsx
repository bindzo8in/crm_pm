"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { format, parse } from "date-fns";
import {
  AlertCircleIcon,
  Building2Icon,
  CheckCircleIcon,
  ClockIcon,
  CoffeeIcon,
  HomeIcon,
  LaptopIcon,
  LoaderCircleIcon,
  MapPinIcon,
  PlayIcon,
  LogOutIcon,
  ShieldCheckIcon,
  SparklesIcon,
  RefreshCwIcon,
} from "lucide-react";
import { WorkMode } from "@/app/generated/prisma/enums";
import {
  clockInAction,
  clockOutAction,
  startBreakAction,
  endBreakAction,
} from "@/actions/attendance";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface PunchClockViewProps {
  initialRecord: any;
  settings: any;
  onRefresh: () => void;
  workMode: WorkMode;
}

type Coordinates = {
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
};

type FreshLocation = {
  lat: number;
  lng: number;
  accuracy: number;
};

const EMPTY_COORDINATES: Coordinates = {
  lat: null,
  lng: null,
  accuracy: null,
};

const MAX_ACCEPTED_ACCURACY_METERS = 100;

function isGeolocationError(error: unknown): error is GeolocationPositionError {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code?: unknown }).code === "number"
  );
}

function getLocationErrorMessage(error: unknown): string {
  if (isGeolocationError(error)) {
    switch (error.code) {
      case 1:
        return "Location permission is blocked. Allow location access in your browser settings, then retry.";
      case 2:
        return "Your device location is unavailable. Turn on GPS/location services and try again.";
      case 3:
        return "Location request timed out. Move to an area with a clearer GPS signal and retry.";
    }
  }

  return error instanceof Error
    ? error.message
    : "Unable to verify your location. Please try again.";
}

function calculateDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const earthRadiusMeters = 6_371_000;
  const deltaLat = toRadians(lat2 - lat1);
  const deltaLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(deltaLng / 2) ** 2;

  return (
    earthRadiusMeters *
    2 *
    Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)))
  );
}

function formatDistance(meters: number): string {
  return meters >= 1000
    ? `${(meters / 1000).toFixed(1)} km`
    : `${Math.round(meters)} m`;
}

export function PunchClockView({
  initialRecord,
  settings,
  onRefresh,
  workMode,
}: PunchClockViewProps) {
  const actionLock = useRef(false);
  const initialLocationRequested = useRef(false);

  const [coords, setCoords] = useState<Coordinates>(EMPTY_COORDINATES);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationPermissionDenied, setLocationPermissionDenied] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notes] = useState("");

  const getFreshLocation = useCallback((): Promise<FreshLocation> => {
    return new Promise((resolve, reject) => {
      if (
        typeof window === "undefined" ||
        !window.isSecureContext ||
        !navigator.geolocation
      ) {
        reject(
          new Error(
            "Location access requires HTTPS and a browser that supports geolocation."
          )
        );
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
          });
        },
        reject,
        {
          enableHighAccuracy: true,
          timeout: 20_000,
          maximumAge: 0,
        }
      );
    });
  }, []);

  const fetchLocation = useCallback(async () => {
    if (actionLock.current || isLocating || loading) return;

    setIsLocating(true);
    setLocationError(null);
    setLocationPermissionDenied(false);

    try {
      const location = await getFreshLocation();
      setCoords(location);

      if (location.accuracy > MAX_ACCEPTED_ACCURACY_METERS) {
        setLocationError(
          `GPS signal is not accurate enough yet (about ${Math.round(
            location.accuracy
          )} m). Try again from an area with a clearer signal.`
        );
      }
    } catch (error) {
      setCoords(EMPTY_COORDINATES);
      const denied = isGeolocationError(error) && error.code === 1;
      setLocationPermissionDenied(denied);
      setLocationError(getLocationErrorMessage(error));
    } finally {
      setIsLocating(false);
    }
  }, [getFreshLocation, isLocating, loading]);

  useEffect(() => {
    if (initialLocationRequested.current) return;
    initialLocationRequested.current = true;
    void fetchLocation();
    // Request location once on mount; retries are user-triggered.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeRecord = initialRecord;
  const isClockedIn = Boolean(activeRecord && !activeRecord.clockOut);
  const openBreak = activeRecord?.breaks?.find((item: any) => !item.breakEnd);
  const isOnBreak = Boolean(openBreak);

  const isLocationReady =
    coords.lat !== null &&
    coords.lng !== null &&
    coords.accuracy !== null &&
    coords.accuracy <= MAX_ACCEPTED_ACCURACY_METERS &&
    !locationError;

  const hasOfficeCoordinates =
    settings?.officeLatitude != null &&
    settings?.officeLongitude != null &&
    Number.isFinite(Number(settings.officeLatitude)) &&
    Number.isFinite(Number(settings.officeLongitude));

  const officeRadius = Number(settings?.officeRadiusMeters ?? 500);
  const officeDistanceMeters =
    isLocationReady && hasOfficeCoordinates
      ? calculateDistanceMeters(
          coords.lat as number,
          coords.lng as number,
          Number(settings.officeLatitude),
          Number(settings.officeLongitude)
        )
      : null;

  const isWithinOfficeGeofence =
    workMode !== WorkMode.OFFICE ||
    (officeDistanceMeters !== null && officeDistanceMeters <= officeRadius);

  const canClockIn = isLocationReady && isWithinOfficeGeofence && (
    workMode !== WorkMode.OFFICE || hasOfficeCoordinates
  );

  const gpsSignal =
    coords.accuracy == null
      ? "Unavailable"
      : coords.accuracy <= 30
        ? "Excellent"
        : coords.accuracy <= 60
          ? "Good"
          : coords.accuracy <= MAX_ACCEPTED_ACCURACY_METERS
            ? "Fair"
            : "Weak";

  const handleClockIn = async () => {
    if (loading || actionLock.current) return;

    actionLock.current = true;
    setLoading(true);
    setIsLocating(true);
    setLocationError(null);
    setLocationPermissionDenied(false);

    try {
      // Always obtain a fresh location immediately before clocking in.
      const location = await getFreshLocation();
      setCoords(location);

      if (location.accuracy > MAX_ACCEPTED_ACCURACY_METERS) {
        throw new Error(
          `GPS accuracy is approximately ${Math.round(
            location.accuracy
          )} m. Please retry when the GPS signal is better.`
        );
      }

      // Re-check the office geofence using the fresh coordinates, not React state.
      if (workMode === WorkMode.OFFICE) {
        if (!hasOfficeCoordinates) {
          throw new Error(
            "Office location has not been configured. Please contact your administrator."
          );
        }

        const freshDistance = calculateDistanceMeters(
          location.lat,
          location.lng,
          Number(settings.officeLatitude),
          Number(settings.officeLongitude)
        );

        if (freshDistance > officeRadius) {
          throw new Error(
            `You are ${formatDistance(freshDistance)} from the office. Move inside the allowed ${officeRadius} m radius to clock in.`
          );
        }
      }

      const result = await clockInAction({
        workMode,
        latitude: location.lat,
        longitude: location.lng,
        notes: notes || undefined,
      });

      if (!result.success) {
        toast.error(result.error || "Failed to clock in.");
        return;
      }

      toast.success("Clocked in successfully!");
      onRefresh();
    } catch (error) {
      const message = getLocationErrorMessage(error);
      const denied = isGeolocationError(error) && error.code === 1;
      setLocationPermissionDenied(denied);
      setLocationError(message);
      if (denied) setCoords(EMPTY_COORDINATES);
      toast.error(message);
    } finally {
      setIsLocating(false);
      setLoading(false);
      actionLock.current = false;
    }
  };

  const handleClockOut = async () => {
    if (loading) return;
    setLoading(true);

    try {
      const result = await clockOutAction({ notes: notes || undefined });
      if (!result.success) {
        toast.error(result.error || "Failed to clock out.");
        return;
      }

      toast.success("Clocked out successfully!");
      onRefresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to clock out."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleToggleBreak = async () => {
    if (loading) return;
    setLoading(true);

    try {
      if (isOnBreak) {
        const result = await endBreakAction({ breakId: openBreak.id });
        if (!result.success) {
          toast.error(result.error || "Failed to end break.");
          return;
        }
        toast.success("Welcome back! Your break has ended.");
      } else {
        const result = await startBreakAction({ type: "LUNCH" });
        if (!result.success) {
          toast.error(result.error || "Failed to start break.");
          return;
        }
        toast.success("Break started.");
      }

      onRefresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update break status."
      );
    } finally {
      setLoading(false);
    }
  };

  const formattedDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const formatShiftTime = (time24: string) =>
    format(parse(time24, "HH:mm", new Date()), "h:mm a");

  const buttonDisabled =
    loading ||
    (isClockedIn && isOnBreak) ||
    (!isClockedIn && isLocating) ||
    (!isClockedIn && workMode === WorkMode.OFFICE && !hasOfficeCoordinates);

  const handleMainButtonClick = () => {
    if (isClockedIn) {
      void handleClockOut();
    } else if (canClockIn) {
      void handleClockIn();
    } else {
      void fetchLocation();
    }
  };

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 pb-24 md:pb-6">
      {/* Attendance header */}
      <Card className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-primary/10 via-background to-background shadow-lg">
        <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-primary/10 blur-3xl" />
        <CardContent className="flex flex-col items-center justify-between gap-5 p-6 md:flex-row md:p-8">
          <div className="space-y-2 text-center md:text-left">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
              <SparklesIcon className="h-3.5 w-3.5" />
              Attendance
            </div>
            <h2 className="text-xl font-bold tracking-tight md:text-2xl">
              Your workday
            </h2>
            <p className="text-sm font-medium text-muted-foreground">
              {formattedDate}
            </p>
          </div>

          <div className="flex flex-col items-center gap-2 md:items-end">
            <div className="flex flex-wrap items-center justify-center gap-2 md:justify-end">
              {isClockedIn ? (
                <Badge
                  variant="outline"
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-semibold",
                    isOnBreak
                      ? "border-amber-500/30 bg-amber-500/10 text-amber-600"
                      : "border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
                  )}
                >
                  {isOnBreak ? (
                    <CoffeeIcon className="mr-1.5 h-3.5 w-3.5" />
                  ) : (
                    <CheckCircleIcon className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  {isOnBreak ? "On Break" : "Active Shift"}
                </Badge>
              ) : activeRecord?.clockOut ? (
                <Badge
                  variant="outline"
                  className="rounded-full border-blue-500/30 bg-blue-500/10 px-3 py-1.5 text-xs font-semibold text-blue-600"
                >
                  <CheckCircleIcon className="mr-1.5 h-3.5 w-3.5" />
                  Shift Completed
                </Badge>
              ) : (
                <Badge variant="secondary" className="rounded-full px-3 py-1.5">
                  <ClockIcon className="mr-1.5 h-3.5 w-3.5" />
                  Not Clocked In
                </Badge>
              )}

              {activeRecord?.status === "LATE" && (
                <Badge variant="destructive" className="rounded-full">
                  Late
                </Badge>
              )}
              {activeRecord?.status === "HALF_DAY" && (
                <Badge
                  variant="outline"
                  className="rounded-full border-amber-500/30 bg-amber-500/10 text-amber-600"
                >
                  <AlertCircleIcon className="mr-1 h-3 w-3" /> Half Day
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Expected shift: {formatShiftTime(settings?.expectedClockIn || "09:00")} – {formatShiftTime(settings?.expectedClockOut || "18:00")}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Unified attendance card */}
      <Card className="relative overflow-hidden rounded-3xl border border-border/60 bg-card shadow-lg">
        <CardContent className="p-5 md:p-8">
          <div className="flex flex-col items-center text-center">
            <p className="text-sm font-semibold text-muted-foreground">
              {isClockedIn ? (isOnBreak ? "Break in progress" : "Your shift is active") : "Ready to start your day?"}
            </p>

            <div className="relative my-6 flex h-64 w-64 items-center justify-center">
              <div
                className={cn(
                  "absolute inset-0 rounded-full border-4 transition-colors duration-300",
                  isClockedIn
                    ? isOnBreak
                      ? "animate-pulse border-amber-500/30 bg-amber-500/5"
                      : "border-emerald-500/30 bg-emerald-500/5"
                    : canClockIn
                      ? "border-emerald-500/30 bg-emerald-500/5"
                      : "border-amber-500/30 bg-amber-500/5"
                )}
              />
              <div
                className={cn(
                  "absolute inset-3 rounded-full border border-dashed",
                  isClockedIn ? "border-emerald-500/30" : "border-primary/25"
                )}
              />
              <button
                type="button"
                disabled={buttonDisabled}
                onClick={handleMainButtonClick}
                aria-label={
                  isClockedIn
                    ? "Clock out"
                    : canClockIn
                      ? "Clock in"
                      : locationPermissionDenied
                        ? "Enable location and retry"
                        : "Retry location"
                }
                className={cn(
                  "relative z-10 flex h-52 w-52 flex-col items-center justify-center rounded-full px-4 text-white shadow-xl transition-all duration-300 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60",
                  isClockedIn
                    ? "bg-gradient-to-br from-rose-500 to-red-600 shadow-rose-500/20"
                    : canClockIn
                      ? "bg-gradient-to-br from-emerald-600 via-emerald-600 to-teal-700 shadow-emerald-500/20 hover:brightness-110"
                      : "bg-gradient-to-br from-amber-500 to-orange-600 shadow-amber-500/20"
                )}
              >
                {loading || isLocating ? (
                  <>
                    <LoaderCircleIcon className="mb-3 h-10 w-10 animate-spin" />
                    <span className="text-lg font-bold">
                      {loading ? "Please wait" : "Checking location"}
                    </span>
                    <span className="mt-1 text-xs font-normal opacity-85">
                      {loading ? "Updating attendance..." : "Finding your location"}
                    </span>
                  </>
                ) : isClockedIn ? (
                  <>
                    <LogOutIcon className="mb-3 h-10 w-10" />
                    <span className="text-xl font-bold uppercase">Clock Out</span>
                    <span className="mt-1 text-xs font-normal opacity-85">End your shift</span>
                  </>
                ) : canClockIn ? (
                  <>
                    <ClockIcon className="mb-3 h-10 w-10" />
                    <span className="text-xl font-bold uppercase">Clock In</span>
                    <span className="mt-1 text-xs font-normal opacity-85">Location verified</span>
                  </>
                ) : (
                  <>
                    {locationPermissionDenied ? (
                      <MapPinIcon className="mb-3 h-10 w-10" />
                    ) : (
                      <RefreshCwIcon className="mb-3 h-10 w-10" />
                    )}
                    <span className="text-center text-lg font-bold">
                      {locationPermissionDenied
                        ? "Turn On Location"
                        : locationError
                          ? "Retry Location"
                          : workMode === WorkMode.OFFICE && !hasOfficeCoordinates
                            ? "Office Setup Needed"
                            : isLocationReady && !isWithinOfficeGeofence
                              ? "Outside Office"
                              : "Check Location"}
                    </span>
                    <span className="mt-1 text-center text-xs font-normal opacity-85">
                      {locationPermissionDenied
                        ? "Allow location in browser settings"
                        : workMode === WorkMode.OFFICE && !hasOfficeCoordinates
                          ? "Contact your administrator"
                          : isLocationReady && !isWithinOfficeGeofence
                            ? "Move within the office radius"
                            : "Tap to try again"}
                    </span>
                  </>
                )}
              </button>
            </div>

            {isClockedIn && (
              <Button
                type="button"
                variant={isOnBreak ? "default" : "outline"}
                disabled={loading}
                onClick={() => void handleToggleBreak()}
                className={cn(
                  "w-full max-w-xs rounded-xl py-5 font-semibold",
                  isOnBreak
                    ? "bg-amber-500 text-white hover:bg-amber-600"
                    : "border-amber-500/40 text-amber-600 hover:bg-amber-500/10"
                )}
              >
                {isOnBreak ? (
                  <>
                    <PlayIcon className="mr-2 h-4 w-4" /> Resume Work
                  </>
                ) : (
                  <>
                    <CoffeeIcon className="mr-2 h-4 w-4" /> Take a Break
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Work mode and human-readable location status */}
          <div className="mt-8 border-t border-border/60 pt-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <section className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    {workMode === WorkMode.OFFICE ? (
                      <Building2Icon className="h-5 w-5" />
                    ) : workMode === WorkMode.REMOTE ? (
                      <HomeIcon className="h-5 w-5" />
                    ) : (
                      <LaptopIcon className="h-5 w-5" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">Work mode</h3>
                    <p className="text-xs text-muted-foreground">Your assigned working location</p>
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-background p-3">
                  <span className="text-sm font-medium">
                    {workMode === WorkMode.OFFICE
                      ? "Office"
                      : workMode === WorkMode.REMOTE
                        ? "Remote"
                        : "Hybrid"}
                  </span>
                  <Badge variant="secondary" className="rounded-full">
                    Assigned
                  </Badge>
                </div>
              </section>

              <section className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                <div className="mb-4 flex items-center gap-3">
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-xl",
                      isLocating
                        ? "bg-blue-500/10 text-blue-600"
                        : isLocationReady
                          ? "bg-emerald-500/10 text-emerald-600"
                          : "bg-amber-500/10 text-amber-600"
                    )}
                  >
                    {isLocating ? (
                      <LoaderCircleIcon className="h-5 w-5 animate-spin" />
                    ) : (
                      <MapPinIcon className="h-5 w-5" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold">Location verification</h3>
                    <p className="text-xs text-muted-foreground">
                      {isLocating
                        ? "Checking your current location..."
                        : isLocationReady
                          ? "Your location is available"
                          : "Location needs attention"}
                    </p>
                  </div>
                  {isLocationReady ? (
                    <CheckCircleIcon className="h-5 w-5 shrink-0 text-emerald-500" />
                  ) : (
                    <AlertCircleIcon className="h-5 w-5 shrink-0 text-amber-500" />
                  )}
                </div>

                <div className="space-y-3 rounded-xl bg-background p-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-muted-foreground">GPS signal</span>
                    <Badge
                      variant="outline"
                      className={cn(
                        "rounded-full",
                        isLocationReady
                          ? "border-emerald-500/30 text-emerald-600"
                          : "border-amber-500/30 text-amber-600"
                      )}
                    >
                      {isLocationReady ? gpsSignal : isLocating ? "Checking" : "Unavailable"}
                    </Badge>
                  </div>

                  {coords.accuracy != null && isLocationReady && (
                    <p className="text-xs text-muted-foreground">
                      GPS precision: within approximately {Math.round(coords.accuracy)} m
                    </p>
                  )}

                  {workMode === WorkMode.OFFICE && (
                    <>
                      <div className="h-px bg-border/60" />
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm text-muted-foreground">Distance from office</span>
                        <span className="text-sm font-semibold">
                          {officeDistanceMeters !== null
                            ? formatDistance(officeDistanceMeters)
                            : hasOfficeCoordinates
                              ? "Waiting for GPS"
                              : "Not configured"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm text-muted-foreground">Office boundary</span>
                        {officeDistanceMeters !== null ? (
                          <Badge
                            variant="outline"
                            className={cn(
                              "rounded-full",
                              isWithinOfficeGeofence
                                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
                                : "border-rose-500/30 bg-rose-500/10 text-rose-600"
                            )}
                          >
                            {isWithinOfficeGeofence ? "Within range" : "Outside range"}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="rounded-full">Pending</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Allowed attendance radius: {officeRadius} m
                      </p>
                    </>
                  )}
                </div>

                {!isLocationReady && (
                  <div className="mt-3 space-y-2">
                    {locationError && (
                      <p className="text-xs leading-relaxed text-rose-500">{locationError}</p>
                    )}
                    {!(workMode === WorkMode.OFFICE && !hasOfficeCoordinates) && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full rounded-xl"
                        onClick={() => void fetchLocation()}
                        disabled={isLocating || loading}
                      >
                        <RefreshCwIcon className="mr-2 h-4 w-4" />
                        {isLocating
                          ? "Checking location..."
                          : locationPermissionDenied
                            ? "Retry after enabling location"
                            : "Retry location"}
                      </Button>
                    )}
                  </div>
                )}
              </section>
            </div>

            <div className="mt-4 flex items-start gap-2 rounded-xl border border-border/50 bg-muted/20 px-3 py-3">
              <ShieldCheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <p className="text-xs leading-relaxed text-muted-foreground">
                Your location is used to verify attendance against your assigned work mode and office policy. Exact coordinates are kept out of this display.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// "use client";

// import { useState, useEffect, useRef } from "react";
// import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
// import { Button } from "@/components/ui/button";
// import { Badge } from "@/components/ui/badge";
// import { WorkMode } from "@/app/generated/prisma/enums";
// // import { SelfieCameraModal } from "./selfie-camera-modal";
// import {
//   clockInAction,
//   clockOutAction,
//   startBreakAction,
//   endBreakAction,
// } from "@/actions/attendance";
// import {
//   ClockIcon,
//   MapPinIcon,
//   LaptopIcon,
//   Building2Icon,
//   HomeIcon,
//   CoffeeIcon,
//   PlayIcon,
//   LogOutIcon,
//   CameraIcon,
//   CheckCircleIcon,
//   AlertCircleIcon,
//   ShieldCheckIcon,
//   SparklesIcon,
// } from "lucide-react";
// import { toast } from "sonner";
// import { cn } from "@/lib/utils";
// import { format, parse } from "date-fns";

// // type SelfieData = {
// //   url: string;
// //   publicId: string;
// // };
// interface PunchClockViewProps {
//   initialRecord: any;
//   settings: any;
//   onRefresh: () => void;
//   workMode: WorkMode;
// }

// export function PunchClockView({ initialRecord, settings, onRefresh, workMode }: PunchClockViewProps) {
//   // const [time, setTime] = useState<Date | null>(null);
//   // const [selectedWorkMode, setSelectedWorkMode] = useState<WorkMode>(
//   //   initialRecord?.workMode || WorkMode.OFFICE
//   // );
//   // const [isCameraOpen, setIsCameraOpen] = useState(false);
//   // const [selfie, setSelfie] = useState<{ url: string; publicId: string } | null>(
//   //   initialRecord?.selfieUrl
//   //     ? { url: initialRecord.selfieUrl, publicId: initialRecord.selfiePublicId || "" }
//   //     : null
//   // );
//   // const [coords, setCoords] = useState<{ lat: number | null; lng: number | null }>({
//   //   lat: initialRecord?.latitude || null,
//   //   lng: initialRecord?.longitude || null,
//   // });
//   const actionLock = useRef(false);
//   const initialLocationRequested = useRef(false);

//   const [coords, setCoords] = useState<{
//     lat: number | null;
//     lng: number | null;
//     accuracy: number | null;
//   }>({
//     lat: null,
//     lng: null,
//     accuracy: null,
//   });

//   const [locationError, setLocationError] = useState<string | null>(null);
//   const [locationPermissionDenied, setLocationPermissionDenied] = useState(false);
//   const [isLocating, setIsLocating] = useState(false);
//   const [notes, setNotes] = useState("");
//   const [loading, setLoading] = useState(false);

//   const getFreshLocation = (): Promise<{
//     lat: number;
//     lng: number;
//     accuracy: number;
//   }> => {
//     return new Promise((resolve, reject) => {
//       if (
//         typeof window === "undefined" ||
//         !window.isSecureContext ||
//         !navigator.geolocation
//       ) {
//         reject(
//           new Error(
//             "Location requires HTTPS and a browser that supports GPS location."
//           )
//         );
//         return;
//       }

//       navigator.geolocation.getCurrentPosition(
//         (position) => {
//           resolve({
//             lat: position.coords.latitude,
//             lng: position.coords.longitude,
//             accuracy: position.coords.accuracy,
//           });
//         },
//         reject,
//         {
//           enableHighAccuracy: true,
//           timeout: 20000,
//           maximumAge: 0,
//         }
//       );
//     });
//   };

//   const getLocationErrorMessage = (error: unknown) => {
//     if (error instanceof GeolocationPositionError) {
//       switch (error.code) {
//         case error.PERMISSION_DENIED:
//           return "Location permission denied. Enable location access in your browser settings.";
//         case error.POSITION_UNAVAILABLE:
//           return "Location unavailable. Turn on device location/GPS and try again.";
//         case error.TIMEOUT:
//           return "Location request timed out. Move to an area with a better signal and retry.";
//       }
//     }

//     return error instanceof Error
//       ? error.message
//       : "Unable to fetch location. Please retry.";
//   };

//   const fetchLocation = async () => {
//     if (isLocating || loading) return;

//     setIsLocating(true);
//     setLocationError(null);
//     setLocationPermissionDenied(false);

//     try {
//       const location = await getFreshLocation();

//       setCoords(location);

//       if (location.accuracy > 100) {
//         setLocationError(
//           `GPS accuracy is approximately ${Math.round(
//             location.accuracy
//           )}m. Please retry for a better location.`
//         );
//         return;
//       }
//     } catch (error) {
//       setCoords({ lat: null, lng: null, accuracy: null });

//       const denied =
//         error instanceof GeolocationPositionError && error.code === 1;

//       setLocationPermissionDenied(denied);
//       setLocationError(getLocationErrorMessage(error));
//     } finally {
//       setIsLocating(false);
//     }
//   };

//   useEffect(() => {
//     if (initialLocationRequested.current) return;

//     initialLocationRequested.current = true;
//     void fetchLocation();

//     // Run once on mount.
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, []);


//   // Request browser geolocation on mount if not available
//   useEffect(() => {
//     fetchLocation();
//   }, []);

//   const activeRecord = initialRecord;
//   const isClockedIn = !!activeRecord && !activeRecord.clockOut;
//   const openBreak = activeRecord?.breaks?.find((b: any) => !b.breakEnd);
//   const isOnBreak = !!openBreak;

//   const isLocationReady =
//     coords.lat != null &&
//     coords.lng != null &&
//     coords.accuracy != null &&
//     coords.accuracy <= 100 &&
//     !locationError;

//   const hasOfficeCoordinates =
//     settings?.officeLatitude != null &&
//     settings?.officeLongitude != null;

//   const calculateDistanceMeters = (
//     lat1: number,
//     lng1: number,
//     lat2: number,
//     lng2: number
//   ) => {
//     const toRad = (degrees: number) => (degrees * Math.PI) / 180;
//     const R = 6371000;

//     const dLat = toRad(lat2 - lat1);
//     const dLng = toRad(lng2 - lng1);

//     const a =
//       Math.sin(dLat / 2) ** 2 +
//       Math.cos(toRad(lat1)) *
//       Math.cos(toRad(lat2)) *
//       Math.sin(dLng / 2) ** 2;

//     return (
//       R *
//       2 *
//       Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)))
//     );
//   };

//   const officeRadius = settings?.officeRadiusMeters ?? 500;

//   const isWithinOfficeGeofence =
//     workMode !== WorkMode.OFFICE ||
//     (isLocationReady &&
//       hasOfficeCoordinates &&
//       calculateDistanceMeters(
//         coords.lat!,
//         coords.lng!,
//         Number(settings.officeLatitude),
//         Number(settings.officeLongitude)
//       ) <= officeRadius);

//   const canClockIn =
//     isLocationReady &&
//     (workMode !== WorkMode.OFFICE ||
//       (hasOfficeCoordinates && isWithinOfficeGeofence));

//   const acquireActionLock = () => {
//     if (actionLock.current) return false;

//     actionLock.current = true;
//     return true;
//   };

//   const releaseActionLock = () => {
//     actionLock.current = false;
//   };




//   const handleClockIn = async () => {
//     if (loading || !acquireActionLock()) return;

//     setLoading(true);
//     setIsLocating(true);
//     setLocationError(null);

//     try {
//       // Always get location before clocking in
//       const location = await getFreshLocation();

//       setCoords({
//         lat: location.lat,
//         lng: location.lng,
//         accuracy: location.accuracy,
//       });

//       // Example threshold; adjust for your office conditions
//       if (location.accuracy > 100) {
//         throw new Error(
//           `GPS accuracy is ${Math.round(location.accuracy)}m. Please retry in an area with a better GPS signal.`
//         );
//       }

//       // Send the newly fetched coordinates, not stale React state
//       const res = await clockInAction({
//         workMode,
//         latitude: location.lat,
//         longitude: location.lng,
//         notes: notes || undefined,
//       });

//       if (!res.success) {
//         toast.error(res.error || "Failed to clock in");
//         return;
//       }

//       toast.success("Clocked in successfully!");
//       onRefresh();
//     } catch (error) {
//       const message =
//         error instanceof Error
//           ? error.message
//           : "Unable to verify your location. Please retry.";

//       setLocationError(message);
//       toast.error(message);
//     } finally {
//       setIsLocating(false);
//       setLoading(false);
//       releaseActionLock();
//     }
//   };


//   const handleClockOut = async () => {
//     if (loading) return;
//     setLoading(true);

//     try {
//       const res = await clockOutAction({
//         notes: notes || undefined,
//       });

//       if (!res.success) {
//         toast.error(res.error || "Failed to clock out");
//         return;
//       }

//       toast.success("Clocked out successfully!");
//       onRefresh();
//     } catch (err: any) {
//       toast.error(err.message || "Failed to clock out");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleToggleBreak = async () => {
//     if (loading) return;
//     setLoading(true);
//     try {
//       if (isOnBreak) {
//         const res = await endBreakAction({ breakId: openBreak.id });
//         if (!res.success) {
//           toast.error(res.error || "Failed to end break");
//           return;
//         }
//         toast.success("Resumed work from break!");
//       } else {
//         const res = await startBreakAction({ type: "LUNCH" });
//         if (!res.success) {
//           toast.error(res.error || "Failed to start break");
//           return;
//         }
//         toast.success("Started break session.");
//       }
//       onRefresh();
//     } catch (err: any) {
//       toast.error(err.message || "Failed to update break status");
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Formatted date string
//   const formattedDate =
//     new Date().toLocaleDateString("en-US", {
//       weekday: "long",
//       year: "numeric",
//       month: "long",
//       day: "numeric",
//     });

//   const railwayTo12 = (time24: string) => {
//     return format(parse(time24, "HH:mm", new Date()), 'h:mm a');
//   };

//   return (
//     <div className="w-full max-w-4xl mx-auto space-y-6 pb-24 md:pb-6">
//       {/* Header Banner */}
//       <Card className="relative overflow-hidden border border-border/60 bg-gradient-to-br from-primary/10 via-background to-background shadow-xl rounded-3xl">
//         <div className="absolute -right-10 -top-10 w-44 h-44 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
//         <CardContent className="p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
//           <div className="space-y-2 text-center md:text-left">
//             <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/15 text-primary text-xs font-semibold">
//               <SparklesIcon className="w-3.5 h-3.5" /> Attendance Kiosk Mode
//             </div>
//             {/* <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
//               {formattedTime}
//             </h1> */}
//             <p className="text-muted-foreground text-sm font-medium">{formattedDate}</p>
//           </div>

//           <div className="flex flex-col items-center md:items-end gap-2">
//             <div className="flex items-center gap-2">
//               {isClockedIn ? (
//                 isOnBreak ? (
//                   <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/30 px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5">
//                     <CoffeeIcon className="w-3.5 h-3.5" /> On Break
//                   </Badge>
//                 ) : (
//                   <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30 px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5">
//                     <CheckCircleIcon className="w-3.5 h-3.5" /> Active Shift
//                   </Badge>
//                 )
//               ) : activeRecord?.clockOut ? (
//                 <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/30 px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5">
//                   <CheckCircleIcon className="w-3.5 h-3.5" /> Shift Completed Today
//                 </Badge>
//               ) : (
//                 <Badge variant="outline" className="bg-muted text-muted-foreground border-border px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5">
//                   <ClockIcon className="w-3.5 h-3.5" /> Not Clocked In
//                 </Badge>
//               )}

//               {activeRecord?.status === "LATE" && (
//                 <Badge variant="destructive" className="px-2.5 py-1 rounded-full text-xs font-semibold">
//                   LATE
//                 </Badge>
//               )}

//               {activeRecord?.status === "HALF_DAY" && (
//                 <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/30 px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
//                   <AlertCircleIcon className="w-3 h-3 text-amber-500" /> HALF DAY (&lt; 4h)
//                 </Badge>
//               )}
//             </div>

//             <p className="text-xs text-muted-foreground">
//               Expected Shift: <span className="font-semibold text-foreground">{railwayTo12(settings?.expectedClockIn || "09:00")}</span> - <span className="font-semibold text-foreground">{railwayTo12(settings?.expectedClockOut || "18:00")}</span>
//             </p>
//           </div>
//         </CardContent>
//       </Card>

//       {/* Main Punch Clock Card & Work Mode Controls */}
//       <div className="grid grid-cols-1 gap-6">
//         {/* Circular Pulse Punch Button Column */}
//         <Card className="w-full border border-border/60 bg-card shadow-lg rounded-3xl p-6 md:p-8 relative overflow-hidden">
//           <div className="my-6 relative flex items-center justify-center">
//             {/* Outer animated ring */}
//             <div
//               className={cn(
//                 "w-60 h-60 rounded-full border-4 flex items-center justify-center transition-all duration-500 shadow-2xl",
//                 isClockedIn
//                   ? isOnBreak
//                     ? "border-amber-500/40 bg-amber-500/5 animate-pulse"
//                     : "border-emerald-500/40 bg-emerald-500/5"
//                   : "border-primary/40 bg-primary/5 hover:scale-105"
//               )}
//             >
//               {/* Inner main button */}
//               <button
//                 type="button"
//                 disabled={
//                   loading ||
//                   (isClockedIn && isOnBreak) ||
//                   (!isClockedIn && isLocating) ||
//                   (!isClockedIn && !canClockIn && !locationError)
//                 }
//                 onClick={() => {
//                   if (isClockedIn) {
//                     void handleClockOut();
//                   } else if (canClockIn) {
//                     void handleClockIn();
//                   } else {
//                     void fetchLocation();
//                   }
//                 }}
//                 className={cn(
//                   "w-48 h-48 rounded-full flex flex-col items-center justify-center text-white font-bold transition-all duration-300 shadow-xl active:scale-95 disabled:opacity-60",
//                   isClockedIn
//                     ? "bg-gradient-to-br from-rose-500 to-red-600"
//                     : !canClockIn
//                       ? "bg-gradient-to-br from-amber-500 to-orange-600"
//                       : "bg-gradient-to-br from-primary via-emerald-600 to-teal-700"
//                 )}
//               >
//                 {isClockedIn ? (
//                   <>
//                     <LogOutIcon className="w-12 h-12 mb-2" />
//                     <span className="text-xl uppercase">Clock Out</span>
//                     <span className="text-xs font-normal mt-1">
//                       Tap to end shift
//                     </span>
//                   </>
//                 ) : isLocating ? (
//                   <>
//                     <MapPinIcon className="w-12 h-12 mb-2 animate-pulse" />
//                     <span className="text-lg">Fetching Location</span>
//                     <span className="text-xs font-normal mt-1">
//                       Please wait...
//                     </span>
//                   </>
//                 ) : !canClockIn ? (
//                   <>
//                     {locationPermissionDenied ? (
//                       <MapPinIcon className="w-12 h-12 mb-2" />
//                     ) : (
//                       <AlertCircleIcon className="w-12 h-12 mb-2" />
//                     )}
//                     <span className="text-lg text-center px-3">
//                       {locationPermissionDenied
//                         ? "Turn On Location"
//                         : locationError
//                           ? "Retry Location"
//                           : !hasOfficeCoordinates && workMode === WorkMode.OFFICE
//                             ? "Office Location Missing"
//                             : isLocationReady && !isWithinOfficeGeofence
//                               ? "Outside Office"
//                               : "Retry Location"}
//                     </span>
//                     <span className="text-xs font-normal mt-1">
//                       {locationPermissionDenied
//                         ? "Enable browser permission"
//                         : locationError
//                           ? "Tap to try again"
//                           : isLocationReady && !isWithinOfficeGeofence
//                             ? "Move inside office radius"
//                             : "Verify your location"}
//                     </span>
//                   </>
//                 ) : (
//                   <>
//                     <ClockIcon className="w-12 h-12 mb-2" />
//                     <span className="text-xl uppercase">Clock In</span>
//                     <span className="text-xs font-normal mt-1">
//                       Location verified
//                     </span>
//                   </>
//                 )}
//               </button>
//               {/* <button
//                 type="button"
//                 disabled={loading || (isClockedIn && isOnBreak)}
//                 onClick={isClockedIn ? handleClockOut : handleClockIn}
//                 className={cn(
//                   "w-48 h-48 rounded-full flex flex-col items-center justify-center text-white font-bold transition-all duration-300 shadow-xl active:scale-95 disabled:opacity-50",
//                   isClockedIn
//                     ? "bg-gradient-to-br from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 shadow-red-500/25"
//                     : "bg-gradient-to-br from-primary via-emerald-600 to-teal-700 hover:brightness-110 shadow-primary/30"
//                 )}
//               >
//                 {isClockedIn ? (
//                   <>
//                     <LogOutIcon className="w-12 h-12 mb-2 animate-bounce" />
//                     <span className="text-xl tracking-wider uppercase">Clock Out</span>
//                     <span className="text-xs font-normal opacity-80 mt-1">Tap to end shift</span>
//                   </>
//                 ) : (
//                   <>
//                     <ClockIcon className="w-12 h-12 mb-2 animate-pulse" />
//                     <span className="text-xl tracking-wider uppercase">Clock In</span>
//                     <span className="text-xs font-normal opacity-80 mt-1">Tap to start shift</span>
//                   </>
//                 )}
//               </button> */}
//             </div>
//           </div>

//           {/* Break Controls if Clocked In */}
//           {isClockedIn && (
//             <div className="w-full max-w-xs mt-4">
//               <Button
//                 type="button"
//                 variant={isOnBreak ? "default" : "outline"}
//                 disabled={loading}
//                 onClick={handleToggleBreak}
//                 className={cn(
//                   "w-full py-5 rounded-2xl font-semibold transition-all shadow-md",
//                   isOnBreak
//                     ? "bg-amber-500 hover:bg-amber-600 text-white"
//                     : "border-amber-500/40 text-amber-600 hover:bg-amber-500/10"
//                 )}
//               >
//                 {isOnBreak ? (
//                   <>
//                     <PlayIcon className="w-4 h-4 mr-2" /> Resume Shift
//                   </>
//                 ) : (
//                   <>
//                     <CoffeeIcon className="w-4 h-4 mr-2" /> Take Break
//                   </>
//                 )}
//               </Button>
//             </div>
//           )}
//           {/* Work Mode & Verification Panel */}
//           <div className="md:col-span-5 space-y-6">
//             {/* Work Mode Selection */}

//             <div
//               className={cn(
//                 "flex flex-col items-center justify-center p-3 rounded-2xl border text-xs font-semibold transition-all border-primary bg-primary/10 text-primary shadow-sm"
//               )}

//             >
//               {workMode === WorkMode.OFFICE && (
//                 <Building2Icon className="w-5 h-5 mb-1.5" />
//               )}
//               {workMode === WorkMode.REMOTE && (
//                 <HomeIcon className="w-5 h-5 mb-1.5" />
//               )}
//               {workMode === WorkMode.HYBRID && (
//                 <LaptopIcon className="w-5 h-5 mb-1.5" />
//               )}
//               <span>{workMode === WorkMode.OFFICE ? "Office" : workMode === WorkMode.REMOTE ? "Remote" : "Hybrid"}</span>
//             </div>
//             {/* {[
//                 { mode: WorkMode.OFFICE, label: "Office", icon: Building2Icon },
//                 { mode: WorkMode.REMOTE, label: "Remote", icon: HomeIcon },
//                 { mode: WorkMode.HYBRID, label: "Hybrid", icon: LaptopIcon },
//               ].map(({ mode, label, icon: Icon }) => (
//                 <div
//                   key={mode}
//                   // type="div"
//                   // disabled={isClockedIn}
//                   // onClick={() => setSelectedWorkMode(mode)}
//                   className={cn(
//                     "flex flex-col items-center justify-center p-3 rounded-2xl border text-xs font-semibold transition-all",
//                     workMode === mode
//                       ? "border-primary bg-primary/10 text-primary shadow-sm"
//                       : "border-border/60 hover:bg-muted/50 text-muted-foreground"
//                   )}
//                 >
//                   <Icon className="w-5 h-5 mb-1.5" />
//                   {label}
//                 </div>
//               ))} */}


//             {/* Location & Geofence Distance Footer */}

//             <div className="flex items-start justify-between">
//               <div className="flex flex-col gap-1">
//                 <div className="flex items-center gap-2 text-xs text-muted-foreground">
//                   <MapPinIcon className="w-4 h-4 text-primary shrink-0" />
//                   <span>
//                     {coords.lat != null && coords.lng != null
//                       ? `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`
//                       : isLocating
//                         ? "Fetching GPS location..."
//                         : locationError ? <span className="text-rose-500">{locationError}</span> : "Location unknown"}
//                   </span>
//                 </div>
//                 {(!coords.lat || locationError) && (
//                   <Button
//                     variant="link"
//                     size="sm"
//                     onClick={fetchLocation}
//                     disabled={isLocating}
//                     className="h-6 p-0 text-[10px] justify-start text-primary w-fit -mt-1 ml-6"
//                   >
//                     {isLocating ? "Retrying..." : "Retry Location"}
//                   </Button>
//                 )}
//               </div>
//               <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-500">
//                 <ShieldCheckIcon className="w-4 h-4" /> Geofence Protected
//               </div>
//             </div>

//             {/* Office Distance Indicator if WorkMode is OFFICE */}
//             {workMode === WorkMode.OFFICE && (
//               <div className="pt-2 border-t border-border/40 text-xs flex items-center justify-between">
//                 <span className="text-muted-foreground font-medium">Office Proximity:</span>
//                 {coords.lat != null && coords.lng != null && settings?.officeLatitude != null && settings?.officeLongitude != null ? (() => {
//                   const R = 6371000;
//                   const dLat = ((settings.officeLatitude - coords.lat!) * Math.PI) / 180;
//                   const dLon = ((settings.officeLongitude - coords.lng!) * Math.PI) / 180;
//                   const a =
//                     Math.sin(dLat / 2) * Math.sin(dLat / 2) +
//                     Math.cos((coords.lat! * Math.PI) / 180) *
//                     Math.cos((settings.officeLatitude * Math.PI) / 180) *
//                     Math.sin(dLon / 2) *
//                     Math.sin(dLon / 2);
//                   const dist = Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
//                   const maxRadius = settings.officeRadiusMeters ?? 500;
//                   const isInRange = dist <= maxRadius;
//                   const distLabel = dist >= 1000 ? `${(dist / 1000).toFixed(2)} km` : `${dist}m`;

//                   return (
//                     <Badge
//                       variant="outline"
//                       className={cn(
//                         "px-2.5 py-0.5 rounded-full text-[11px] font-semibold flex items-center gap-1",
//                         isInRange
//                           ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
//                           : "bg-rose-500/10 text-rose-600 border-rose-500/30"
//                       )}
//                     >
//                       {isInRange ? (
//                         <CheckCircleIcon className="w-3 h-3 text-emerald-500" />
//                       ) : (
//                         <AlertCircleIcon className="w-3 h-3 text-rose-500" />
//                       )}
//                       {distLabel} away (Limit: {maxRadius}m)
//                     </Badge>
//                   );
//                 })() : (
//                   <span className="text-muted-foreground text-[11px] italic">
//                     {settings?.officeLatitude == null
//                       ? "Office coordinates not set by admin"
//                       : "Waiting for GPS coordinates..."}
//                   </span>
//                 )}
//               </div>
//             )}
//           </div>
//         </Card>

//       </div>
//     </div>
//   );
// }
