"use client";

import * as React from "react";
import { Eye, ImagePlus, LoaderCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { uploadImageToServer } from "@/lib/upload-client";
import type { UploadScope } from "@/lib/upload-scopes";

interface ImageUploadProps {
  value: { url: string; publicId: string } | null;
  onChange: (value: { url: string; publicId: string } | null) => void;
  scope: UploadScope;
  ownerId?: string;
  disabled?: boolean;
}

export function ImageUpload({
  disabled = false,
  onChange,
  value,
  scope,
  ownerId,
}: ImageUploadProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const [previewOpen, setPreviewOpen] = React.useState(false);

  async function handleFile(file: File | undefined) {
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);
    try {
      const asset = await uploadImageToServer(file, scope, {
        ownerId,
        onProgress: setUploadProgress,
      });
      onChange({ url: asset.url, publicId: asset.publicId });
      toast.success("Image uploaded");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not upload this image.";
      toast.error(message);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="w-full max-w-sm space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        aria-label="Choose an image to upload"
        disabled={disabled || isUploading}
        onChange={(event) => {
          void handleFile(event.currentTarget.files?.[0]);
          event.currentTarget.value = "";
        }}
      />

      <div
        className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-xl border bg-muted/30 p-3"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          if (!disabled && !isUploading) void handleFile(event.dataTransfer.files[0]);
        }}
      >
        {value?.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={value.url}
            alt="Uploaded image preview"
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <div className="space-y-2 text-center text-muted-foreground">
            <ImagePlus className="mx-auto size-8" aria-hidden="true" />
            <p className="text-sm">Drop an image here or choose a file</p>
          </div>
        )}
        {isUploading && (
          <div
            className="absolute inset-x-0 bottom-0 flex items-center gap-2 bg-background/95 px-3 py-2 text-xs"
            role="status"
            aria-live="polite"
          >
            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
            <span className="flex-1">Uploading image</span>
            <span>{uploadProgress}%</span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || isUploading}
          onClick={() => fileInputRef.current?.click()}
        >
          {isUploading ? <LoaderCircle className="animate-spin" /> : <ImagePlus />}
          {value?.url ? "Replace image" : "Choose image"}
        </Button>
        {value?.url && (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled || isUploading}
              onClick={() => setPreviewOpen(true)}
            >
              <Eye />
              Preview
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled || isUploading}
              onClick={() => onChange(null)}
            >
              <Trash2 />
              Remove
            </Button>
          </>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        JPG, PNG, or WebP. Maximum file size: 10 MB.
      </p>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="flex h-[min(85dvh,48rem)] max-w-4xl flex-col sm:max-w-4xl">
          <DialogHeader className="shrink-0">
            <DialogTitle>Image preview</DialogTitle>
          </DialogHeader>
          {value?.url && (
            <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto rounded-lg bg-muted/40 p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={value.url}
                alt="Full-size uploaded image"
                className="max-h-full max-w-full object-contain"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
