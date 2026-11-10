"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { format, parse } from "date-fns";
import {
  AlertCircleIcon,
  CalendarOffIcon,
  CheckCircleIcon,
  ClockIcon,
  CoffeeIcon,
  LoaderCircleIcon,
  MapPinIcon,
  PlayIcon,
  LogOutIcon,
  RefreshCwIcon,
  ShieldCheckIcon,
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
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface PunchClockViewProps {
  initialRecord: any;
  settings: any;
  dayStatus: {
    isWeekend: boolean;
    weekday: string;
    holidayName: string | null;
  } | null;
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
  dayStatus,
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

  const activeRecord = initialRecord;
  const isClockedIn = Boolean(activeRecord && !activeRecord.clockOut);
  const isNonWorkingDay = Boolean(dayStatus?.isWeekend || dayStatus?.holidayName);

  useEffect(() => {
    if (initialLocationRequested.current) return;
    initialLocationRequested.current = true;
    if (isNonWorkingDay && !isClockedIn) return;
    // Initial geolocation is an intentional mount-time request.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchLocation();
    // Request location once on mount; retries are user-triggered.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const formattedDate = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(new Date());

  const formatShiftTime = (time24: string) =>
    format(parse(time24, "HH:mm", new Date()), "h:mm a");

  const buttonDisabled =
    loading ||
    (isNonWorkingDay && !isClockedIn) ||
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
    <div className="mx-auto w-full max-w-4xl px-1 pb-24 md:pb-6 sm:px-4">
      <div className="flex flex-col items-center py-4 text-center sm:py-6">
            <h1 className="text-base font-semibold text-foreground sm:text-lg">
            {isClockedIn
              ? (isOnBreak ? "Break in progress" : "Your shift is active")
              : isNonWorkingDay
                ? "Today is a non-working day"
                : "Ready to start your day?"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{formattedDate}</p>

          {isNonWorkingDay && !isClockedIn && (
            <section
              role="status"
              className="my-5 w-full max-w-xl rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 text-left"
            >
              <div className="flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-300">
                  <CalendarOffIcon aria-hidden="true" className="size-5" />
                </span>
                <div className="space-y-1">
                  <h2 className="font-semibold text-foreground">
                    {dayStatus?.holidayName
                      ? `Holiday: ${dayStatus.holidayName}`
                      : `It’s ${dayStatus?.weekday ?? "a scheduled day off"}`}
                  </h2>
                  <p className="text-sm leading-5 text-muted-foreground">
                    {dayStatus?.isWeekend && dayStatus.holidayName
                      ? `${dayStatus.weekday} is also a scheduled non-working day.`
                      : dayStatus?.isWeekend
                        ? "Your weekly schedule marks today as a non-working day."
                        : "A holiday is scheduled for your department today."}
                    {" "}Clock-in is unavailable today.
                  </p>
                </div>
              </div>
            </section>
          )}

          {(!isNonWorkingDay || isClockedIn) && (
          <div className="my-4 flex w-full max-w-sm items-center justify-center sm:relative sm:my-5 sm:size-64 sm:max-w-none">
              <div
                className={cn(
                  "absolute inset-0 hidden rounded-full border-4 transition-colors duration-300 sm:block",
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
                  "absolute inset-3 hidden rounded-full border border-dashed sm:block",
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
                  "relative z-10 flex h-16 w-full flex-row items-center justify-center gap-3 rounded-2xl px-4 text-white shadow-lg transition-all duration-300 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none sm:size-52 sm:flex-col sm:gap-0 sm:rounded-full sm:px-3 sm:shadow-xl sm:active:scale-95",
                  isClockedIn
                    ? "bg-gradient-to-br from-rose-500 to-red-600 shadow-rose-500/20"
                    : canClockIn
                      ? "bg-gradient-to-br from-emerald-600 via-emerald-600 to-teal-700 shadow-emerald-500/20 hover:brightness-110"
                      : "bg-gradient-to-br from-amber-500 to-orange-600 shadow-amber-500/20"
                )}
              >
                {loading || isLocating ? (
                  <>
                    <LoaderCircleIcon className="size-6 shrink-0 animate-spin sm:mb-3 sm:size-10" />
                    <span className="flex flex-col items-start sm:items-center">
                      <span className="text-base font-bold sm:text-lg">
                        {loading ? "Please wait" : "Checking location"}
                      </span>
                      <span className="text-xs font-normal opacity-85">
                        {loading ? "Updating attendance..." : "Finding your location"}
                      </span>
                    </span>
                  </>
                ) : isClockedIn ? (
                  <>
                    <LogOutIcon className="size-6 shrink-0 sm:mb-3 sm:size-10" />
                    <span className="flex flex-col items-start sm:items-center">
                      <span className="text-base font-bold uppercase sm:text-xl">Clock Out</span>
                      <span className="text-xs font-normal opacity-85">End your shift</span>
                    </span>
                  </>
                ) : canClockIn ? (
                  <>
                    <ClockIcon className="size-6 shrink-0 sm:mb-3 sm:size-10" />
                    <span className="flex flex-col items-start sm:items-center">
                      <span className="text-base font-bold uppercase sm:text-xl">Clock In</span>
                      <span className="text-xs font-normal opacity-85">Location verified</span>
                    </span>
                  </>
                ) : (
                  <>
                    {locationPermissionDenied ? (
                      <MapPinIcon className="size-6 shrink-0 sm:mb-3 sm:size-10" />
                    ) : (
                      <RefreshCwIcon className="size-6 shrink-0 sm:mb-3 sm:size-10" />
                    )}
                    <span className="flex flex-col items-start sm:items-center">
                      <span className="text-left text-base font-bold sm:text-center sm:text-lg">
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
                      <span className="text-left text-xs font-normal opacity-85 sm:text-center">
                        {locationPermissionDenied
                          ? "Allow location in browser settings"
                          : workMode === WorkMode.OFFICE && !hasOfficeCoordinates
                            ? "Contact your administrator"
                            : isLocationReady && !isWithinOfficeGeofence
                              ? "Move within the office radius"
                              : "Tap to try again"}
                      </span>
                    </span>
                  </>
                )}
              </button>
            </div>
            )}

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

          {(!isNonWorkingDay || isClockedIn) && <section
            aria-labelledby="location-verification-title"
            className="mt-4 w-full space-y-3 border-y border-border/60 py-4 text-left"
          >
            <div className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <MapPinIcon aria-hidden="true" className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 id="location-verification-title" className="font-medium">
                  Location verification
                </h2>
                <p className="text-sm text-muted-foreground">
                  {isLocating
                    ? "Checking your current location..."
                    : isLocationReady
                      ? `${gpsSignal} GPS signal`
                      : "Confirm your location before clocking in."}
                </p>
              </div>
              <Badge
                variant="outline"
                className={isLocationReady
                  ? "shrink-0 border-emerald-500/30 text-emerald-600"
                  : "shrink-0 border-amber-500/30 text-amber-600"}
              >
                {isLocating ? "Checking" : isLocationReady ? "Ready" : "Needs attention"}
              </Badge>
            </div>

            <dl className="divide-y divide-border/60">
              <div className="flex items-center justify-between gap-3 py-2.5">
                <dt className="text-sm text-muted-foreground">Work mode</dt>
                <dd className="text-sm font-medium">
                  {workMode === WorkMode.OFFICE
                    ? "Office"
                    : workMode === WorkMode.REMOTE
                      ? "Remote"
                      : "Hybrid"}
                </dd>
              </div>
              {coords.accuracy != null && isLocationReady && (
                <div className="flex items-center justify-between gap-3 py-2.5">
                  <dt className="text-sm text-muted-foreground">GPS precision</dt>
                  <dd className="text-sm font-medium">About {Math.round(coords.accuracy)} m</dd>
                </div>
              )}
              {workMode === WorkMode.OFFICE && (
                <>
                  <div className="flex items-center justify-between gap-3 py-2.5">
                    <dt className="text-sm text-muted-foreground">Distance from office</dt>
                    <dd className="text-sm font-medium">
                      {officeDistanceMeters == null
                        ? hasOfficeCoordinates ? "Waiting for GPS" : "Not configured"
                        : officeDistanceMeters >= 1000
                          ? `${(officeDistanceMeters / 1000).toFixed(1)} km`
                          : `${Math.round(officeDistanceMeters)} m`}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3 py-2.5">
                    <dt className="text-sm text-muted-foreground">Office boundary</dt>
                    <dd>
                      <Badge
                        variant="outline"
                        className={officeDistanceMeters == null
                          ? "text-muted-foreground"
                          : isWithinOfficeGeofence
                            ? "border-emerald-500/30 text-emerald-600"
                            : "border-rose-500/30 text-rose-600"}
                      >
                        {officeDistanceMeters == null
                          ? "Pending"
                          : isWithinOfficeGeofence
                            ? "Within range"
                            : "Outside range"}
                      </Badge>
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3 py-2.5">
                    <dt className="text-sm text-muted-foreground">Allowed radius</dt>
                    <dd className="text-sm font-medium">{officeRadius} m</dd>
                  </div>
                </>
              )}
            </dl>
            {locationError && (
              <p className="border-l-2 border-rose-500/60 pl-3 text-xs leading-relaxed text-rose-500">
                {locationError}
              </p>
            )}
            <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
              <ShieldCheckIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-emerald-600" />
              Exact coordinates are used for attendance verification and are not shown here.
            </p>
          </section>}

          {(!isNonWorkingDay || isClockedIn) && <div className="mt-5 flex flex-col gap-3 border-t border-border/60 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
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
                    <CoffeeIcon className="mr-1.5 size-3.5" />
                  ) : (
                    <CheckCircleIcon className="mr-1.5 size-3.5" />
                  )}
                  {isOnBreak ? "On Break" : "Active Shift"}
                </Badge>
              ) : activeRecord?.clockOut ? (
                <Badge
                  variant="outline"
                  className="rounded-full border-blue-500/30 bg-blue-500/10 px-3 py-1.5 text-xs font-semibold text-blue-600"
                >
                  <CheckCircleIcon className="mr-1.5 size-3.5" />
                  Shift Completed
                </Badge>
              ) : (
                <Badge variant="secondary" className="rounded-full px-3 py-1.5">
                  <ClockIcon className="mr-1.5 size-3.5" />
                  Not Clocked In
                </Badge>
              )}
              {activeRecord?.status === "LATE" && (
                <Badge variant="destructive" className="rounded-full">Late</Badge>
              )}
              {activeRecord?.status === "HALF_DAY" && (
                <Badge
                  variant="outline"
                  className="rounded-full border-amber-500/30 bg-amber-500/10 text-amber-600"
                >
                  <AlertCircleIcon className="mr-1 size-3" /> Half Day
                </Badge>
              )}
            </div>
            <p className="text-center text-xs text-muted-foreground sm:text-right">
              Shift: {formatShiftTime(settings?.expectedClockIn || "09:00")} – {formatShiftTime(settings?.expectedClockOut || "18:00")}
            </p>
          </div>}
    </div>
  );
}