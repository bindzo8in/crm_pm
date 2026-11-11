import { v2 as cloudinary } from "cloudinary";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { env } from "@/lib/env";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const allowedTypes = [
  "image/jpeg", "image/png", "image/webp", "image/gif",
  "video/mp4", "video/webm", "video/quicktime",
  "audio/mpeg", "audio/mp4", "audio/webm", "audio/ogg", "audio/wav",
  "application/pdf", "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];

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

function configureCloudinary() {
  cloudinary.config({
    cloud_name: env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

function positiveDimension(value: number | undefined) {
  return value !== undefined && Number.isInteger(value) && value > 0 ? value : null;
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return Response.json({ message: "Upload requests must come from this site." }, { status: 403 });
  }
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return Response.json({ message: "Sign in to upload media." }, { status: 401 });

  try {
    const formData = await request.formData();
    const conversationId = z.string().min(1).parse(formData.get("conversationId"));
    const membership = await prisma.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId, userId: session.user.id } },
      select: { conversationId: true },
    });
    if (!membership) return Response.json({ message: "You are not a participant in this conversation." }, { status: 403 });

    const file = formData.get("file");
    if (!(file instanceof File)) return Response.json({ message: "Choose a file to upload." }, { status: 400 });
    const mimeType = file.type.split(";")[0].trim().toLowerCase();
    if (!allowedTypes.includes(mimeType)) return Response.json({ message: "This file type is not supported." }, { status: 415 });
    if (file.size === 0 || file.size > MAX_FILE_SIZE) return Response.json({ message: "Media must be between 1 byte and 25 MB." }, { status: 413 });

    if (!env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
      return Response.json({ message: "File uploads are not configured. Contact your administrator." }, { status: 503 });
    }

    const cloudinaryResourceType = mimeType === "audio/webm"
      ? "raw"
      : mimeType.startsWith("image/")
      ? "image"
      : mimeType.startsWith("video/")
        ? "video"
        : mimeType.startsWith("audio/")
          ? "video"
          : "raw";
    const buffer = Buffer.from(await file.arrayBuffer());
    let result: { secure_url: string; public_id: string; width?: number; height?: number; duration?: number };
    try {
      configureCloudinary();
      result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: `crm/chat/${conversationId}`,
            resource_type: cloudinaryResourceType,
            max_bytes: MAX_FILE_SIZE,
            use_filename: false,
            unique_filename: true,
          },
          (error, uploadResult) => error || !uploadResult ? reject(error ?? new Error("Upload failed.")) : resolve(uploadResult),
        );
        stream.end(buffer);
      });
    } catch (error) {
      console.error("Cloudinary chat media upload failed:", error);
      return Response.json({ message: "Cloudinary could not upload this media. Try again." }, { status: 502 });
    }

    return Response.json({
      asset: {
        url: result.secure_url,
        publicId: result.public_id,
        resourceType: mimeType.startsWith("audio/") && cloudinaryResourceType === "video"
          ? "audio"
          : cloudinaryResourceType,
        mimeType: file.type,
        fileName: file.name,
        fileSize: file.size,
        width: positiveDimension(result.width),
        height: positiveDimension(result.height),
        duration: result.duration ? Math.round(result.duration) : null,
      },
    });
  } catch {
    return Response.json({ message: "Unable to upload this media." }, { status: 400 });
  }
}
