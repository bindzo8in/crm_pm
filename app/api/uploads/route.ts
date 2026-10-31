import { v2 as cloudinary } from "cloudinary";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { env } from "@/lib/env";
import prisma from "@/lib/prisma";
import { uploadScopes, type UploadScope } from "@/lib/upload-scopes";
import { hasBusinessWorkspaceAccess } from "@/lib/workspace-access";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_REQUEST_SIZE = MAX_FILE_SIZE + 64 * 1024;
const deleteSchema = z.object({
  scope: z.enum(uploadScopes),
  publicId: z.string().trim().min(1).max(500),
  resourceType: z.enum(["image", "raw"]),
  ownerId: z.string().trim().min(1).max(100).optional(),
});

function jsonError(message: string, status: number) {
  return Response.json({ message }, { status });
}

function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;

  try {
    const requestOrigin = new URL(origin).origin;
    return requestOrigin === new URL(request.url).origin
      || requestOrigin === new URL(env.NEXT_PUBLIC_SITE_URL).origin;
  } catch {
    return false;
  }
}

async function getAuthorizedUser(request: Request, scope: UploadScope) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return null;

  if (scope === "customer" && !hasBusinessWorkspaceAccess(session.user)) {
    return null;
  }

  if (scope === "account-profile" || scope === "attendance-profile") {
    return session.user;
  }
  if (scope === "proposal-signature") return null;

  const permissionScope = {
    customer: "customers",
    expense: "finance",
    company: "company",
    "bank-account": "bankAccounts",
    proposal: "proposals",
    terms: "terms",
  }[scope];
  const [canCreate, canUpdate] = await Promise.all([
    auth.api.userHasPermission({
      headers: request.headers,
      body: { permissions: { [permissionScope]: ["create"] } },
    }),
    auth.api.userHasPermission({
      headers: request.headers,
      body: { permissions: { [permissionScope]: ["update"] } },
    }),
  ]);
  return canCreate.success || canUpdate.success ? session.user : null;
}

async function getAuthorizedFolder(
  request: Request,
  scope: UploadScope,
  ownerId: FormDataEntryValue | null,
) {
  if (scope === "proposal-signature") {
    if (typeof ownerId !== "string" || !ownerId.trim()) return null;
    const proposal = await prisma.proposal.findUnique({
      where: { id: ownerId },
      select: { id: true, status: true },
    });
    return proposal?.status === "SENT"
      ? `proposal-signatures/${proposal.id}`
      : null;
  }

  const user = await getAuthorizedUser(request, scope);
  if (!user) return null;

  switch (scope) {
    case "customer":
      return `customers/${user.id}`;
    case "expense":
      return `finance/expenses/${user.id}`;
    case "company":
      return `company/${user.id}`;
    case "bank-account":
      return `bank-accounts/${user.id}`;
    case "account-profile":
      return `profiles/account/${user.id}`;
    case "attendance-profile":
      return `profiles/attendance/${user.id}`;
    case "proposal":
      return `cms/proposals/${user.id}`;
    case "terms":
      return `cms/terms/${user.id}`;
  }
}

function isOwnedPublicId(publicId: string, folder: string) {
  if (
    !publicId.startsWith(`${folder}/`)
    || publicId.includes("\\")
    || publicId.includes("//")
  ) {
    return false;
  }
  return publicId.split("/").every((part) => part.length > 0 && part !== "." && part !== "..");
}

function getDetectedMimeType(buffer: Buffer) {
  if (buffer.subarray(0, 5).toString("ascii") === "%PDF-") return "application/pdf";
  if (buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) return "image/jpeg";
  if (buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return "image/png";
  if (
    buffer.subarray(0, 4).toString("ascii") === "RIFF"
    && buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

function configureCloudinary() {
  cloudinary.config({
    cloud_name: env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

function uploadBuffer(
  buffer: Buffer,
  folder: string,
  resourceType: "image" | "raw",
) {
  return new Promise<Awaited<ReturnType<typeof cloudinary.uploader.upload>>>((
    resolve,
    reject,
  ) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType,
        allowed_formats: ["jpg", "jpeg", "png", "webp", "pdf"],
        max_bytes: MAX_FILE_SIZE,
        use_filename: false,
        unique_filename: true,
      },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error("Cloudinary returned no upload result."));
          return;
        }
        resolve(result);
      },
    );
    stream.end(buffer);
  });
}

async function destroyAsset(publicId: string, resourceType: "image" | "raw") {
  return cloudinary.uploader.destroy(publicId, {
    resource_type: resourceType,
    type: "upload",
    invalidate: true,
  });
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError("Upload requests must come from this site.", 403);

  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_SIZE) {
    return jsonError("Files must be 10 MB or smaller.", 413);
  }

  try {
    const formData = await request.formData();
    const parsedScope = z.enum(uploadScopes).safeParse(formData.get("scope"));
    if (!parsedScope.success) {
      return jsonError("Select a valid upload destination.", 400);
    }
    const scope = parsedScope.data;

    const folder = await getAuthorizedFolder(request, scope, formData.get("ownerId"));
    if (!folder) return jsonError("You are not allowed to upload files here.", 403);

    const file = formData.get("file");
    if (!(file instanceof File)) return jsonError("Choose a file to upload.", 400);
    if (file.size === 0) return jsonError("The selected file is empty.", 400);
    if (file.size > MAX_FILE_SIZE) return jsonError("Files must be 10 MB or smaller.", 413);

    const buffer = Buffer.from(await file.arrayBuffer());
    const detectedMimeType = getDetectedMimeType(buffer);
    if (!detectedMimeType) {
      return jsonError("Only JPG, PNG, WebP, or PDF files are supported.", 415);
    }
    if (
      file.type
      && file.type !== "application/octet-stream"
      && file.type !== detectedMimeType
    ) {
      return jsonError("The file content does not match its file type.", 415);
    }

    const resourceType = detectedMimeType === "application/pdf" ? "raw" : "image";
    if (resourceType === "raw" && scope !== "customer" && scope !== "expense") {
      return jsonError("Only image files are supported in this area.", 415);
    }
    const oldPublicId = formData.get("replacePublicId");
    const oldResourceType = formData.get("replaceResourceType");
    const isReplacing = oldPublicId !== null || oldResourceType !== null;
    if (
      isReplacing
      && (
        typeof oldPublicId !== "string"
        || typeof oldResourceType !== "string"
        || (oldResourceType !== "image" && oldResourceType !== "raw")
        || !isOwnedPublicId(oldPublicId, folder)
      )
    ) {
      return jsonError("This file cannot be replaced.", 400);
    }

    if (!env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
      return jsonError("File uploads are not configured. Contact your administrator.", 503);
    }
    configureCloudinary();
    const uploaded = await uploadBuffer(buffer, folder, resourceType);
    if (isReplacing && typeof oldPublicId === "string" && (oldResourceType === "image" || oldResourceType === "raw")) {
      const deleted = await destroyAsset(oldPublicId, oldResourceType);
      if (deleted.result !== "ok" && deleted.result !== "not found") {
        const rollback = await destroyAsset(uploaded.public_id, resourceType);
        if (rollback.result !== "ok" && rollback.result !== "not found") {
          console.error("Could not roll back replacement upload:", rollback.result);
        }
        console.error("Cloudinary did not confirm replacement deletion:", deleted.result);
        return jsonError("The old file could not be replaced. Try again.", 502);
      }
    }

    return Response.json({
      asset: {
        url: uploaded.secure_url,
        publicId: uploaded.public_id,
        resourceType,
        fileName: file.name.slice(0, 255),
      },
    });
  } catch (error) {
    console.error("Server-side file upload failed:", error);
    return jsonError("Could not upload this file. Try again.", 500);
  }
}

export async function DELETE(request: Request) {
  if (!isSameOrigin(request)) return jsonError("Delete requests must come from this site.", 403);

  try {
    const parsed = deleteSchema.safeParse(await request.json());
    if (!parsed.success) return jsonError("Invalid file details.", 400);

    const folder = await getAuthorizedFolder(
      request,
      parsed.data.scope,
      parsed.data.ownerId ?? null,
    );
    if (!folder) return jsonError("You are not allowed to delete files here.", 403);
    if (!isOwnedPublicId(parsed.data.publicId, folder)) {
      return jsonError("This file cannot be deleted.", 403);
    }

    if (!env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
      return jsonError("File deletion is not configured. Contact your administrator.", 503);
    }
    configureCloudinary();
    const result = await destroyAsset(parsed.data.publicId, parsed.data.resourceType);
    if (result.result !== "ok" && result.result !== "not found") {
      console.error("Cloudinary did not confirm file deletion:", result.result);
      return jsonError("Cloudinary could not delete this file.", 502);
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("Server-side file deletion failed:", error);
    return jsonError("Could not delete this file. Try again.", 500);
  }
}
