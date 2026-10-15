"use client";

import { CldUploadWidget, type CloudinaryUploadWidgetResults } from "next-cloudinary";
import { FileUp, ExternalLink, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { deleteExpenseAttachment } from "@/actions/finance";
import { Button } from "@/components/ui/button";
import { env } from "@/lib/env";

type ExpenseAttachment = {
  url: string;
  publicId: string;
  resourceType: "image" | "raw";
};

type ExpenseAttachmentUploadProps = {
  value: ExpenseAttachment | null;
  onChange: (attachment: ExpenseAttachment | null) => void;
  folder: string;
  disabled?: boolean;
};

function isDeleteResourceType(value: unknown): value is ExpenseAttachment["resourceType"] {
  return value === "image" || value === "raw";
}

export function ExpenseAttachmentUpload({
  value,
  onChange,
  folder,
  disabled = false,
}: ExpenseAttachmentUploadProps) {
  const [isRemoving, setIsRemoving] = useState(false);

  function handleSuccess(result: CloudinaryUploadWidgetResults) {
    const info = result.info;
    if (
      info
      && typeof info === "object"
      && "secure_url" in info
      && typeof info.secure_url === "string"
      && "public_id" in info
      && typeof info.public_id === "string"
      && "resource_type" in info
      && isDeleteResourceType(info.resource_type)
    ) {
      onChange({
        url: info.secure_url,
        publicId: info.public_id,
        resourceType: info.resource_type,
      });
      return;
    }

    toast.error("The uploaded attachment did not return a usable URL.");
  }

  async function handleRemove() {
    if (!value) return;
    setIsRemoving(true);

    try {
      const response = await deleteExpenseAttachment({
        publicId: value.publicId,
        resourceType: value.resourceType,
      });
      if (!response.success) {
        toast.error(response.message);
        return;
      }

      onChange(null);
      toast.success("Attachment deleted");
    } catch {
      toast.error("Could not delete the attachment. Try again.");
    } finally {
      setIsRemoving(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {value ? (
        <>
          <Button type="button" variant="outline" size="sm" asChild>
            <a href={value.url} target="_blank" rel="noreferrer">
              <ExternalLink />
              View attachment
            </a>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled || isRemoving}
            onClick={() => void handleRemove()}
          >
            <X />
            {isRemoving ? "Deleting…" : "Remove"}
          </Button>
        </>
      ) : (
        <CldUploadWidget
          uploadPreset={env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET}
          options={{
            resourceType: "auto",
            folder,
            multiple: false,
            clientAllowedFormats: ["jpg", "jpeg", "png", "webp", "pdf"],
            maxFileSize: 10_000_000,
            singleUploadAutoClose: true,
          }}
          onSuccess={handleSuccess}
          onError={(error) => {
            console.error("Expense attachment upload failed:", error);
            toast.error("Could not upload the attachment.");
          }}
          onOpen={() => {
            document.body.style.pointerEvents = "auto";
          }}
          onClose={() => {
            document.body.style.removeProperty("pointer-events");
          }}
        >
          {({ open }) => (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={() => open()}
            >
              <FileUp />
              Upload receipt
            </Button>
          )}
        </CldUploadWidget>
      )}
      <span className="text-xs text-muted-foreground">Image or PDF, up to 10 MB</span>
    </div>
  );
}
