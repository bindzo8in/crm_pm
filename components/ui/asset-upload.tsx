"use client";

import * as React from "react";
import { ArrowDown, ArrowUp, Eye, FileText, FileUp, GripVertical, LoaderCircle, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type UploadedAsset = {
  url: string;
  publicId: string;
  resourceType: "image" | "raw";
  fileName?: string;
};

type UploadScope = "customer" | "expense";

type AssetUploadProps = {
  scope: UploadScope;
  value: UploadedAsset[];
  onChange: (assets: UploadedAsset[]) => void;
  multiple?: boolean;
  maxFiles?: number;
  disabled?: boolean;
};

const ACCEPTED_TYPES = "image/jpeg,image/png,image/webp,application/pdf";
const MAX_FILE_SIZE = 10 * 1024 * 1024;

function isUploadedAsset(value: unknown): value is UploadedAsset {
  if (!value || typeof value !== "object") return false;
  return (
    "url" in value
    && typeof value.url === "string"
    && "publicId" in value
    && typeof value.publicId === "string"
    && "resourceType" in value
    && (value.resourceType === "image" || value.resourceType === "raw")
    && (!("fileName" in value) || typeof value.fileName === "string")
  );
}

function errorMessage(payload: unknown, fallback: string) {
  if (
    payload
    && typeof payload === "object"
    && "message" in payload
    && typeof payload.message === "string"
  ) {
    return payload.message;
  }
  return fallback;
}

function assetName(asset: UploadedAsset) {
  return asset.fileName || asset.publicId.split("/").at(-1) || "Uploaded file";
}

export function AssetUpload({
  scope,
  value,
  onChange,
  multiple = true,
  maxFiles = 3,
  disabled = false,
}: AssetUploadProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const replacementInputRef = React.useRef<HTMLInputElement>(null);
  const replacementIndexRef = React.useRef<number | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const [removingId, setRemovingId] = React.useState<string | null>(null);
  const [previewAsset, setPreviewAsset] = React.useState<UploadedAsset | null>(null);
  const [draggedIndex, setDraggedIndex] = React.useState<number | null>(null);

  async function uploadFile(file: File, replaceAsset?: UploadedAsset) {
    const body = new FormData();
    body.set("scope", scope);
    body.set("file", file);
    if (replaceAsset) {
      body.set("replacePublicId", replaceAsset.publicId);
      body.set("replaceResourceType", replaceAsset.resourceType);
    }

    const response = await fetch("/api/uploads", { method: "POST", body });
    const payload: unknown = await response.json();
    if (!response.ok || !payload || typeof payload !== "object" || !("asset" in payload) || !isUploadedAsset(payload.asset)) {
      throw new Error(errorMessage(payload, "Could not upload this file."));
    }
    return payload.asset;
  }

  async function handleFiles(files: FileList | File[], replacementIndex: number | null = null) {
    const selectedFiles = Array.from(files);
    if (replacementIndex !== null) selectedFiles.splice(1);
    if (selectedFiles.length === 0) return;

    const maxAllowed = multiple ? maxFiles : 1;
    const availableSlots = replacementIndex === null
      ? maxAllowed - value.length
      : selectedFiles.length;
    if (availableSlots <= 0) {
      toast.error(`You can upload up to ${maxAllowed} file${maxAllowed === 1 ? "" : "s"}.`);
      return;
    }

    setIsUploading(true);
    let nextAssets = [...value];
    let addedCount = 0;
    try {
      for (const [fileIndex, file] of selectedFiles.entries()) {
        const targetIndex = replacementIndex === null
          ? null
          : replacementIndex + fileIndex;
        if (targetIndex === null && nextAssets.length >= maxAllowed) {
          toast.error(`Only ${maxAllowed} file${maxAllowed === 1 ? "" : "s"} can be uploaded.`);
          break;
        }
        if (file.size > MAX_FILE_SIZE) {
          toast.error(`${file.name} is larger than 10 MB.`);
          continue;
        }

        const existing = targetIndex === null ? undefined : nextAssets[targetIndex];
        try {
          const uploaded = await uploadFile(file, existing);
          if (targetIndex === null || !existing) {
            nextAssets = [...nextAssets, uploaded];
          } else {
            nextAssets = nextAssets.map((asset, index) => index === targetIndex ? uploaded : asset);
          }
          addedCount += 1;
          onChange(nextAssets);
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Could not upload this file.");
        }
      }

      if (addedCount > 0) toast.success(addedCount === 1 ? "File uploaded" : "Files uploaded");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function removeAsset(asset: UploadedAsset) {
    setRemovingId(asset.publicId);
    try {
      const response = await fetch("/api/uploads", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope,
          publicId: asset.publicId,
          resourceType: asset.resourceType,
        }),
      });
      const payload: unknown = await response.json();
      if (!response.ok) throw new Error(errorMessage(payload, "Could not delete this file."));

      onChange(value.filter((item) => item.publicId !== asset.publicId));
      toast.success("File deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete this file.");
    } finally {
      setRemovingId(null);
    }
  }

  function reorderAssets(fromIndex: number, toIndex: number) {
    if (fromIndex === toIndex) return;
    const reordered = [...value];
    const [asset] = reordered.splice(fromIndex, 1);
    if (!asset) return;
    reordered.splice(toIndex, 0, asset);
    onChange(reordered);
  }

  return (
    <div className="w-full space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_TYPES}
        multiple={multiple}
        className="sr-only"
        aria-label="Choose files to upload"
        disabled={disabled || isUploading}
        onChange={(event) => {
          void handleFiles(event.currentTarget.files ?? []);
          event.currentTarget.value = "";
        }}
      />
      <input
        ref={replacementInputRef}
        type="file"
        accept={ACCEPTED_TYPES}
        className="sr-only"
        aria-label="Choose a replacement file"
        disabled={disabled || isUploading}
        onChange={(event) => {
          const index = replacementIndexRef.current;
          replacementIndexRef.current = null;
          if (index !== null) void handleFiles(event.currentTarget.files ?? [], index);
          event.currentTarget.value = "";
        }}
      />

      <div
        className="rounded-md border border-dashed border-primary/40 bg-muted/20 px-4 py-5 text-center transition-colors hover:bg-muted/40"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          if (!disabled && !isUploading && event.dataTransfer.files.length > 0) {
            const replacementIndex = !multiple && value.length > 0 ? 0 : null;
            void handleFiles(event.dataTransfer.files, replacementIndex);
          }
        }}
      >
        <FileUp className="mx-auto size-6 text-primary" aria-hidden="true" />
        <p className="mt-2 text-sm font-medium">
          Drop {multiple ? "files" : "a file"} here or browse
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          JPG, PNG, WebP or PDF · Up to 10 MB{multiple ? ` · ${maxFiles} files maximum` : ""}
        </p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="mt-3"
          disabled={disabled || isUploading || (!multiple && value.length > 0) || (multiple && value.length >= maxFiles)}
          onClick={() => {
            replacementIndexRef.current = null;
            fileInputRef.current?.click();
          }}
        >
          {isUploading ? <LoaderCircle className="animate-spin" /> : <FileUp />}
          {isUploading ? "Uploading…" : "Browse files"}
        </Button>
      </div>

      {value.length > 0 && (
        <ul className="space-y-2" aria-label="Uploaded files">
          {value.map((asset, index) => (
            <li
              key={asset.publicId}
              draggable={!disabled && !isUploading}
              onDragStart={(event) => {
                if (event.dataTransfer.files.length > 0) return;
                setDraggedIndex(index);
                event.dataTransfer.setData("text/plain", String(index));
                event.dataTransfer.effectAllowed = "move";
              }}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                event.stopPropagation();
                if (event.dataTransfer.files.length > 0) {
                  void handleFiles(event.dataTransfer.files, index);
                  return;
                }
                const fromIndex = Number(event.dataTransfer.getData("text/plain"));
                if (Number.isInteger(fromIndex)) reorderAssets(fromIndex, index);
                setDraggedIndex(null);
              }}
              onDragEnd={() => setDraggedIndex(null)}
              className={`flex items-center gap-2 rounded-md border bg-background p-2 ${draggedIndex === index ? "opacity-50" : ""}`}
            >
              <span className="cursor-grab text-muted-foreground" aria-label={`Drag to reorder ${assetName(asset)}`}>
                <GripVertical className="size-4" />
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Move ${assetName(asset)} up`}
                disabled={disabled || isUploading || index === 0}
                onClick={() => reorderAssets(index, index - 1)}
              >
                <ArrowUp />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Move ${assetName(asset)} down`}
                disabled={disabled || isUploading || index === value.length - 1}
                onClick={() => reorderAssets(index, index + 1)}
              >
                <ArrowDown />
              </Button>
              {asset.resourceType === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={asset.url} alt="" className="size-10 rounded object-cover" />
              ) : (
                <FileText className="size-8 shrink-0 text-muted-foreground" aria-hidden="true" />
              )}
              <span className="min-w-0 flex-1 truncate text-xs" title={assetName(asset)}>
                {assetName(asset)}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Preview ${assetName(asset)}`}
                disabled={disabled}
                onClick={() => setPreviewAsset(asset)}
              >
                <Eye />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Replace ${assetName(asset)}`}
                disabled={disabled || isUploading || removingId === asset.publicId}
                onClick={() => {
                  replacementIndexRef.current = index;
                  replacementInputRef.current?.click();
                }}
              >
                <Pencil />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Delete ${assetName(asset)}`}
                disabled={disabled || isUploading || removingId === asset.publicId}
                onClick={() => void removeAsset(asset)}
              >
                {removingId === asset.publicId ? <LoaderCircle className="animate-spin" /> : <Trash2 />}
              </Button>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={previewAsset !== null} onOpenChange={(open) => {
        if (!open) setPreviewAsset(null);
      }}>
        <DialogContent className="flex h-[85dvh] max-w-5xl flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle className="truncate pr-8">
              {previewAsset ? assetName(previewAsset) : "File preview"}
            </DialogTitle>
          </DialogHeader>
          {previewAsset?.resourceType === "image" ? (
            <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto rounded-md bg-muted/40 p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewAsset.url} alt={assetName(previewAsset)} className="max-h-full max-w-full object-contain" />
            </div>
          ) : previewAsset ? (
            <iframe
              src={previewAsset.url}
              title={assetName(previewAsset)}
              className="min-h-0 flex-1 rounded-md border"
            />
          ) : null}
          <Button type="button" variant="outline" className="self-end" onClick={() => setPreviewAsset(null)}>
            <X />
            Close preview
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
