"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CameraIcon, RefreshCwIcon, CheckCircle2Icon, AlertCircleIcon, SwitchCameraIcon } from "lucide-react";
import { env } from "@/lib/env";
import { toast } from "sonner";

interface SelfieCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (selfieData: { url: string; publicId: string }) => void;
}

export function SelfieCameraModal({ isOpen, onClose, onCapture }: SelfieCameraModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [cameraError, setCameraError] = useState<string | null>(null);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 720 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Camera access error:", err);
      setCameraError("Unable to access camera. Please allow camera permissions in your browser.");
    }
  }, [facingMode]);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  }, [stream]);

  useEffect(() => {
    if (isOpen && !capturedImage) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, capturedImage, facingMode]);

  const takeSnapshot = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (ctx) {
      // Flip horizontally if front camera for natural mirror effect
      if (facingMode === "user") {
        ctx.translate(width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(video, 0, 0, width, height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      setCapturedImage(dataUrl);
      stopCamera();
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    startCamera();
  };

  const handleConfirmAndUpload = async () => {
    if (!capturedImage) return;

    setIsUploading(true);
    try {
      const cloudName = env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      const uploadPreset = env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

      const formData = new FormData();
      formData.append("file", capturedImage);
      formData.append("upload_preset", uploadPreset);

      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload image to Cloudinary");
      }

      const result = await response.json();
      onCapture({
        url: result.secure_url,
        publicId: result.public_id,
      });
      toast.success("Selfie verified successfully!");
      onClose();
    } catch (err: any) {
      console.error("Upload error:", err);
      toast.error(err.message || "Failed to upload selfie. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const toggleCamera = () => {
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-background border-border text-foreground p-6 rounded-2xl shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <CameraIcon className="w-5 h-5 text-primary" />
            Live Selfie Verification
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Please capture a clear photo of your face to verify your attendance clock-in.
          </DialogDescription>
        </DialogHeader>

        <div className="relative w-full aspect-square bg-muted rounded-2xl overflow-hidden border border-border flex items-center justify-center">
          {cameraError ? (
            <div className="p-6 text-center text-destructive flex flex-col items-center gap-2">
              <AlertCircleIcon className="w-10 h-10" />
              <p className="text-sm font-medium">{cameraError}</p>
              <Button size="sm" variant="outline" className="mt-2" onClick={startCamera}>
                Try Again
              </Button>
            </div>
          ) : capturedImage ? (
            <img src={capturedImage} alt="Captured Selfie" className="w-full h-full object-cover" />
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${facingMode === "user" ? "scale-x-[-1]" : ""}`}
              />
              <div className="absolute inset-0 border-4 border-dashed border-primary/40 rounded-2xl pointer-events-none flex items-center justify-center">
                <div className="w-48 h-64 border-2 border-primary/70 rounded-full opacity-60" />
              </div>
              <Button
                type="button"
                size="icon"
                variant="secondary"
                className="absolute top-3 right-3 rounded-full bg-background/80 backdrop-blur shadow-md"
                onClick={toggleCamera}
                title="Switch Camera"
              >
                <SwitchCameraIcon className="w-4 h-4" />
              </Button>
            </>
          )}

          <canvas ref={canvasRef} className="hidden" />
        </div>

        <DialogFooter className="flex items-center justify-between gap-3 pt-2">
          {capturedImage ? (
            <>
              <Button variant="outline" type="button" onClick={handleRetake} disabled={isUploading} className="flex-1">
                <RefreshCwIcon className="w-4 h-4 mr-2" /> Retake
              </Button>
              <Button type="button" onClick={handleConfirmAndUpload} disabled={isUploading} className="flex-1">
                {isUploading ? (
                  <>
                    <RefreshCwIcon className="w-4 h-4 mr-2 animate-spin" /> Uploading...
                  </>
                ) : (
                  <>
                    <CheckCircle2Icon className="w-4 h-4 mr-2" /> Confirm Selfie
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" type="button" onClick={onClose} className="w-full">
                Cancel
              </Button>
              <Button
                type="button"
                onClick={takeSnapshot}
                disabled={!!cameraError}
                className="w-full bg-primary text-primary-foreground font-semibold rounded-xl py-6"
              >
                <CameraIcon className="w-5 h-5 mr-2" /> Snap Selfie
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
