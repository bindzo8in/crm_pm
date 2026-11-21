"use client";

import { AssetUpload, type UploadedAsset } from "@/components/ui/asset-upload";

type ExpenseAttachmentUploadProps = {
  value: UploadedAsset | null;
  onChange: (attachment: UploadedAsset | null) => void;
  expenseId?: string;
  savedReceiptUrl?: string | null;
  disabled?: boolean;
};

export function ExpenseAttachmentUpload({
  value,
  onChange,
  expenseId,
  savedReceiptUrl,
  disabled = false,
}: ExpenseAttachmentUploadProps) {
  return (
    <AssetUpload
      scope="expense"
      getPreviewUrl={(asset) => (
        expenseId && asset.url === savedReceiptUrl
          ? `/api/finance/expenses/${encodeURIComponent(expenseId)}/receipt`
          : asset.url
      )}
      getDownloadUrl={(asset) => (
        expenseId && asset.url === savedReceiptUrl
          ? `/api/finance/expenses/${encodeURIComponent(expenseId)}/receipt?download=1`
          : asset.url
      )}
      value={value ? [value] : []}
      onChange={(assets) => onChange(assets[0] ?? null)}
      multiple={false}
      maxFiles={1}
      disabled={disabled}
    />
  );
}
