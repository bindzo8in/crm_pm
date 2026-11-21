const imageContentTypes: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export type ExpenseReceiptFile = {
  url: URL;
  extension: string;
  contentType: string;
};

export function parseExpenseReceiptUrl(
  value: string,
): ExpenseReceiptFile | null {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }

  if (
    url.protocol !== "https:"
    || url.hostname !== "res.cloudinary.com"
    || url.port
    || url.username
    || url.password
  ) {
    return null;
  }

  const pathSegments = url.pathname.split("/").filter(Boolean);
  const [cloudName, resourceType, uploadAction] = pathSegments;
  if (
    !cloudName
    || !/^[a-zA-Z0-9_-]+$/.test(cloudName)
    || uploadAction !== "upload"
  ) {
    return null;
  }

  const fileName = pathSegments.at(-1);
  const extension = fileName?.includes(".")
    ? fileName.split(".").at(-1)?.toLowerCase()
    : undefined;

  if (resourceType === "raw") {
    if (extension && extension !== "pdf") return null;
    return {
      url,
      extension: "pdf",
      contentType: "application/pdf",
    };
  }

  if (resourceType !== "image" || !extension) return null;
  if (extension === "pdf") {
    return { url, extension, contentType: "application/pdf" };
  }

  const contentType = imageContentTypes[extension];
  if (contentType) {
    return { url, extension, contentType };
  }

  return null;
}
