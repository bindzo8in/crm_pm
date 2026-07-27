"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WorkMode, AttendanceStatus } from "@/app/generated/prisma/enums";
import { SelfieCameraModal } from "./selfie-camera-modal";
import {
  clockInAction,
  clockOutAction,
  startBreakAction,
  endBreakAction,
} from "@/actions/attendance";
import {
  ClockIcon,
  MapPinIcon,
  LaptopIcon,
  Building2Icon,
  HomeIcon,
  CoffeeIcon,
  PlayIcon,
  LogOutIcon,
  CameraIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface PunchClockViewProps {
  initialRecord: any;
  settings: any;
  onRefresh: () => void;
}

export function PunchClockView({ initialRecord, settings, onRefresh }: PunchClockViewProps) {
  const [time, setTime] = useState<Date | null>(null);
  const [selectedWorkMode, setSelectedWorkMode] = useState<WorkMode>(
    initialRecord?.workMode || WorkMode.OFFICE
  );
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [selfie, setSelfie] = useState<{ url: string; publicId: string } | null>(
    initialRecord?.selfieUrl
      ? { url: initialRecord.selfieUrl, publicId: initialRecord.selfiePublicId || "" }
      : null
  );
  const [coords, setCoords] = useState<{ lat: number | null; lng: number | null }>({
    lat: initialRecord?.latitude || null,
    lng: initialRecord?.longitude || null,
  });
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  // Live Digital Clock
  useEffect(() => {
    setTime(new Date());
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Request browser geolocation on mount if not available
  useEffect(() => {
    if (typeof window !== "undefined" && "geolocation" in navigator && !coords.lat) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
        },
        (err) => console.log("Geolocation notice:", err.message),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  }, [coords.lat]);

  const activeRecord = initialRecord;
  const isClockedIn = !!activeRecord && !activeRecord.clockOut;
  const openBreak = activeRecord?.breaks?.find((b: any) => !b.breakEnd);
  const isOnBreak = !!openBreak;

  const handleClockIn = async () => {
    if (!selfie?.url) {
      setIsCameraOpen(true);
      toast.info("Please capture a live selfie to complete clock-in.");
      return;
    }

    setLoading(true);
    try {
      const res = await clockInAction({
        workMode: selectedWorkMode,
        latitude: coords.lat,
        longitude: coords.lng,
        selfieUrl: selfie.url,
        selfiePublicId: selfie.publicId,
        notes: notes || undefined,
      });

      if (!res.success) {
        toast.error(res.error || "Failed to clock in");
        return;
      }

      toast.success("Clocked in successfully!");
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to clock in");
    } finally {
      setLoading(false);
    }
  };

  const handleClockOut = async () => {
    setLoading(true);
    try {
      const res = await clockOutAction({
        notes: notes || undefined,
      });

      if (!res.success) {
        toast.error(res.error || "Failed to clock out");
        return;
      }

      toast.success("Clocked out successfully!");
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to clock out");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleBreak = async () => {
    setLoading(true);
    try {
      if (isOnBreak) {
        const res = await endBreakAction({ breakId: openBreak.id });
        if (!res.success) {
          toast.error(res.error || "Failed to end break");
          return;
        }
        toast.success("Resumed work from break!");
      } else {
        const res = await startBreakAction({ type: "LUNCH" });
        if (!res.success) {
          toast.error(res.error || "Failed to start break");
          return;
        }
        toast.success("Started break session.");
      }
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to update break status");
    } finally {
      setLoading(false);
    }
  };

  // Formatted date string
  const formattedDate = time
    ? time.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";

  const formattedTime = time
    ? time.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      })
    : "00:00:00 AM";

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 pb-24 md:pb-6">
      {/* Header Banner */}
      <Card className="relative overflow-hidden border border-border/60 bg-gradient-to-br from-primary/10 via-background to-background shadow-xl rounded-3xl">
        <div className="absolute -right-10 -top-10 w-44 h-44 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <CardContent className="p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/15 text-primary text-xs font-semibold">
              <SparklesIcon className="w-3.5 h-3.5" /> Attendance Kiosk Mode
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
              {formattedTime}
            </h1>
            <p className="text-muted-foreground text-sm font-medium">{formattedDate}</p>
          </div>

          <div className="flex flex-col items-center md:items-end gap-2">
            <div className="flex items-center gap-2">
              {isClockedIn ? (
                isOnBreak ? (
                  <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/30 px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5">
                    <CoffeeIcon className="w-3.5 h-3.5" /> On Break
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30 px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5">
                    <CheckCircleIcon className="w-3.5 h-3.5" /> Active Shift
                  </Badge>
                )
              ) : activeRecord?.clockOut ? (
                <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/30 px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5">
                  <CheckCircleIcon className="w-3.5 h-3.5" /> Shift Completed Today
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-muted text-muted-foreground border-border px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5">
                  <ClockIcon className="w-3.5 h-3.5" /> Not Clocked In
                </Badge>
              )}

              {activeRecord?.status === "LATE" && (
                <Badge variant="destructive" className="px-2.5 py-1 rounded-full text-xs font-semibold">
                  LATE
                </Badge>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              Expected Shift: <span className="font-semibold text-foreground">{settings?.expectedClockIn || "09:00"}</span> - <span className="font-semibold text-foreground">{settings?.expectedClockOut || "18:00"}</span>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Main Punch Clock Card & Work Mode Controls */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Circular Pulse Punch Button Column */}
        <Card className="md:col-span-7 border border-border/60 bg-card shadow-lg rounded-3xl flex flex-col items-center justify-center p-8 text-center relative overflow-hidden">
          <div className="my-6 relative flex items-center justify-center">
            {/* Outer animated ring */}
            <div
              className={cn(
                "w-60 h-60 rounded-full border-4 flex items-center justify-center transition-all duration-500 shadow-2xl",
                isClockedIn
                  ? isOnBreak
                    ? "border-amber-500/40 bg-amber-500/5 animate-pulse"
                    : "border-emerald-500/40 bg-emerald-500/5"
                  : "border-primary/40 bg-primary/5 hover:scale-105"
              )}
            >
              {/* Inner main button */}
              <button
                type="button"
                disabled={loading || (isClockedIn && isOnBreak)}
                onClick={isClockedIn ? handleClockOut : handleClockIn}
                className={cn(
                  "w-48 h-48 rounded-full flex flex-col items-center justify-center text-white font-bold transition-all duration-300 shadow-xl active:scale-95 disabled:opacity-50",
                  isClockedIn
                    ? "bg-gradient-to-br from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 shadow-red-500/25"
                    : "bg-gradient-to-br from-primary via-emerald-600 to-teal-700 hover:brightness-110 shadow-primary/30"
                )}
              >
                {isClockedIn ? (
                  <>
                    <LogOutIcon className="w-12 h-12 mb-2 animate-bounce" />
                    <span className="text-xl tracking-wider uppercase">Clock Out</span>
                    <span className="text-xs font-normal opacity-80 mt-1">Tap to end shift</span>
                  </>
                ) : (
                  <>
                    <ClockIcon className="w-12 h-12 mb-2 animate-pulse" />
                    <span className="text-xl tracking-wider uppercase">Clock In</span>
                    <span className="text-xs font-normal opacity-80 mt-1">Tap to start shift</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Break Controls if Clocked In */}
          {isClockedIn && (
            <div className="w-full max-w-xs mt-4">
              <Button
                type="button"
                variant={isOnBreak ? "default" : "outline"}
                disabled={loading}
                onClick={handleToggleBreak}
                className={cn(
                  "w-full py-5 rounded-2xl font-semibold transition-all shadow-md",
                  isOnBreak
                    ? "bg-amber-500 hover:bg-amber-600 text-white"
                    : "border-amber-500/40 text-amber-600 hover:bg-amber-500/10"
                )}
              >
                {isOnBreak ? (
                  <>
                    <PlayIcon className="w-4 h-4 mr-2" /> Resume Shift
                  </>
                ) : (
                  <>
                    <CoffeeIcon className="w-4 h-4 mr-2" /> Take Break
                  </>
                )}
              </Button>
            </div>
          )}
        </Card>

        {/* Work Mode & Verification Panel */}
        <div className="md:col-span-5 space-y-6">
          {/* Work Mode Selection */}
          <Card className="border border-border/60 bg-card shadow-lg rounded-3xl p-6">
            <CardHeader className="p-0 mb-4">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <LaptopIcon className="w-5 h-5 text-primary" /> Work Mode
              </CardTitle>
              <CardDescription className="text-xs">Select your working location</CardDescription>
            </CardHeader>
            <CardContent className="p-0 grid grid-cols-3 gap-2">
              {[
                { mode: WorkMode.OFFICE, label: "Office", icon: Building2Icon },
                { mode: WorkMode.REMOTE, label: "Remote", icon: HomeIcon },
                { mode: WorkMode.HYBRID, label: "Hybrid", icon: LaptopIcon },
              ].map(({ mode, label, icon: Icon }) => (
                <button
                  key={mode}
                  type="button"
                  disabled={isClockedIn}
                  onClick={() => setSelectedWorkMode(mode)}
                  className={cn(
                    "flex flex-col items-center justify-center p-3 rounded-2xl border text-xs font-semibold transition-all",
                    selectedWorkMode === mode
                      ? "border-primary bg-primary/10 text-primary shadow-sm"
                      : "border-border/60 hover:bg-muted/50 text-muted-foreground"
                  )}
                >
                  <Icon className="w-5 h-5 mb-1.5" />
                  {label}
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Selfie Snapshot Viewfinder Card */}
          <Card className="border border-border/60 bg-card shadow-lg rounded-3xl p-6">
            <CardHeader className="p-0 mb-4 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <CameraIcon className="w-5 h-5 text-primary" /> Selfie Verification
                </CardTitle>
                <CardDescription className="text-xs">Direct Cloudinary capture</CardDescription>
              </div>
              {selfie?.url && (
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30 text-[10px]">
                  Verified
                </Badge>
              )}
            </CardHeader>
            <CardContent className="p-0 flex items-center gap-4">
              <div className="relative w-20 h-20 bg-muted rounded-2xl overflow-hidden border border-border flex items-center justify-center flex-shrink-0">
                {selfie?.url ? (
                  <img src={selfie.url} alt="Selfie Verification" className="w-full h-full object-cover" />
                ) : (
                  <CameraIcon className="w-8 h-8 text-muted-foreground/50" />
                )}
              </div>

              <div className="flex-1 space-y-2">
                {!isClockedIn && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsCameraOpen(true)}
                    className="w-full rounded-xl text-xs font-medium"
                  >
                    <CameraIcon className="w-3.5 h-3.5 mr-1.5" />
                    {selfie?.url ? "Retake Selfie" : "Take Live Selfie"}
                  </Button>
                )}
                <p className="text-[11px] text-muted-foreground">
                  {selfie?.url ? "Photo ready for attendance log." : "Live photo required before clocking in."}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Location & Device Info Footer */}
          <Card className="border border-border/60 bg-card shadow-lg rounded-3xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <MapPinIcon className="w-4 h-4 text-primary" />
              <span>
                {coords.lat && coords.lng
                  ? `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`
                  : "Location logged"}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-500">
              <ShieldCheckIcon className="w-4 h-4" /> Secure Session
            </div>
          </Card>
        </div>
      </div>

      {/* Selfie Camera Modal Handler */}
      <SelfieCameraModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={(data) => setSelfie(data)}
      />
    </div>
  );
}
