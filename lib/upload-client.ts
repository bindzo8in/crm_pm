import type { UploadScope } from "@/lib/upload-scopes";

const SUPPORTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export type UploadedImage = {
  url: string;
  publicId: string;
  resourceType: "image";
};

function responseMessage(payload: unknown, fallback: string) {
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

function isUploadedImage(value: unknown): value is UploadedImage {
  return Boolean(
    value
    && typeof value === "object"
    && "url" in value
    && typeof value.url === "string"
    && "publicId" in value
    && typeof value.publicId === "string"
    && "resourceType" in value
    && value.resourceType === "image",
  );
}

export function uploadImageToServer(
  file: File,
  scope: UploadScope,
  options: {
    ownerId?: string;
    onProgress?: (progress: number) => void;
    signal?: AbortSignal;
  } = {},
) {
  if (
    file.type
    && file.type !== "application/octet-stream"
    && !SUPPORTED_IMAGE_TYPES.includes(file.type)
  ) {
    return Promise.reject(new Error("Choose a JPG, PNG, or WebP image."));
  }
  if (file.size === 0) {
    return Promise.reject(new Error("The selected image is empty."));
  }
  if (file.size > 10 * 1024 * 1024) {
    return Promise.reject(new Error("Images must be 10 MB or smaller."));
  }
  if (options.signal?.aborted) {
    return Promise.reject(new Error("Upload cancelled."));
  }

  return new Promise<UploadedImage>((resolve, reject) => {
    const request = new XMLHttpRequest();
    const body = new FormData();
    body.set("scope", scope);
    body.set("file", file);
    if (options.ownerId) body.set("ownerId", options.ownerId);

    const cleanup = () => options.signal?.removeEventListener("abort", abort);
    const abort = () => request.abort();
    const fail = (message: string) => {
      cleanup();
      reject(new Error(message));
    };

    request.open("POST", "/api/uploads");
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        options.onProgress?.(Math.round((event.loaded / event.total) * 100));
      }
    };
    request.onload = () => {
      let payload: unknown;
      try {
        payload = JSON.parse(request.responseText);
      } catch {
        fail("The server returned an invalid upload response.");
        return;
      }

      if (request.status < 200 || request.status >= 300) {
        fail(responseMessage(payload, "Could not upload this image."));
        return;
      }
      if (
        !payload
        || typeof payload !== "object"
        || !("asset" in payload)
        || !isUploadedImage(payload.asset)
      ) {
        fail("The server returned an invalid upload response.");
        return;
      }

      cleanup();
      options.onProgress?.(100);
      resolve(payload.asset);
    };
    request.onerror = () => fail("A network error interrupted the upload.");
    request.onabort = () => fail("Upload cancelled.");
    options.signal?.addEventListener("abort", abort, { once: true });
    request.send(body);
  });
}
