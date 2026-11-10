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
    if (!allowedTypes.includes(file.type)) return Response.json({ message: "This file type is not supported." }, { status: 415 });
    if (file.size === 0 || file.size > MAX_FILE_SIZE) return Response.json({ message: "Media must be between 1 byte and 25 MB." }, { status: 413 });

    configureCloudinary();
    const resourceType = file.type.startsWith("image/")
      ? "image"
      : file.type.startsWith("video/")
        ? "video"
        : file.type.startsWith("audio/")
          ? "video"
          : "raw";
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await new Promise<{ secure_url: string; public_id: string; width?: number; height?: number; duration?: number }>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: `crm/chat/${conversationId}`,
          resource_type: resourceType,
          max_bytes: MAX_FILE_SIZE,
          use_filename: false,
          unique_filename: true,
        },
        (error, uploadResult) => error || !uploadResult ? reject(error ?? new Error("Upload failed.")) : resolve(uploadResult),
      );
      stream.end(buffer);
    });
    return Response.json({
      asset: {
        url: result.secure_url,
        publicId: result.public_id,
        resourceType,
        mimeType: file.type,
        fileName: file.name,
        fileSize: file.size,
        width: result.width ?? null,
        height: result.height ?? null,
        duration: result.duration ? Math.round(result.duration) : null,
      },
    });
  } catch {
    return Response.json({ message: "Unable to upload this media." }, { status: 400 });
  }
}
