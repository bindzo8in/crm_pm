"use client";

import { AssetUpload, type UploadedAsset } from "@/components/ui/asset-upload";

type ExpenseAttachmentUploadProps = {
  value: UploadedAsset | null;
  onChange: (attachment: UploadedAsset | null) => void;
  disabled?: boolean;
};

export function ExpenseAttachmentUpload({
  value,
  onChange,
  disabled = false,
}: ExpenseAttachmentUploadProps) {
  return (
    <AssetUpload
      scope="expense"
      value={value ? [value] : []}
      onChange={(assets) => onChange(assets[0] ?? null)}
      multiple={false}
      maxFiles={1}
      disabled={disabled}
    />
  );
}
