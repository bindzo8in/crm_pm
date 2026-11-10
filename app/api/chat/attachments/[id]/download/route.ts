import { auth } from "@/lib/auth";
import { createAttachmentContentDisposition } from "@/lib/chat-attachment";
import { env } from "@/lib/env";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

function isAllowedCloudinaryUrl(url: URL, resourceType: string) {
  const cloudName = env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const cloudinaryResourceType = resourceType === "IMAGE"
    ? "image"
    : resourceType === "VIDEO" || resourceType === "AUDIO"
      ? "video"
      : "raw";

  return url.protocol === "https:"
    && url.hostname === "res.cloudinary.com"
    && !url.username
    && !url.password
    && url.pathname.startsWith(`/${cloudName}/${cloudinaryResourceType}/upload/`);
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    return Response.json({ message: "Sign in to download this attachment." }, { status: 401 });
  }

  const { id } = await params;
  const attachment = await prisma.chatMessageAttachment.findFirst({
    where: {
      id,
      deletedAt: null,
      message: { deletedAt: null, conversation: { deletedAt: null } },
    },
    select: {
      url: true,
      resourceType: true,
      mimeType: true,
      fileName: true,
      message: {
        select: {
          conversation: {
            select: { id: true, projectId: true },
          },
        },
      },
    },
  });
  if (!attachment) {
    return Response.json({ message: "Attachment not found." }, { status: 404 });
  }

  const conversation = attachment.message.conversation;
  let hasAccess = false;
  if (conversation.projectId) {
    const membership = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: conversation.projectId, userId: session.user.id } },
      select: { projectId: true },
    });
    const project = membership ? null : await prisma.project.findUnique({
      where: { id: conversation.projectId },
      select: { projectManagerId: true, createdById: true },
    });
    hasAccess = Boolean(membership || project && (
      project.projectManagerId === session.user.id || project.createdById === session.user.id
    ));
  } else {
    const membership = await prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: {
          conversationId: conversation.id,
          userId: session.user.id,
        },
      },
      select: { conversationId: true },
    });
    hasAccess = Boolean(membership);
  }
  if (!hasAccess) {
    return Response.json({ message: "You cannot access this attachment." }, { status: 403 });
  }

  let cloudinaryUrl: URL;
  try {
    cloudinaryUrl = new URL(attachment.url);
  } catch {
    console.error("Chat attachment has an invalid delivery URL", { attachmentId: id });
    return Response.json({ message: "Attachment URL is invalid." }, { status: 502 });
  }
  if (!isAllowedCloudinaryUrl(cloudinaryUrl, attachment.resourceType)) {
    console.error("Chat attachment points outside the configured Cloudinary account", { attachmentId: id });
    return Response.json({ message: "Attachment storage location is invalid." }, { status: 502 });
  }

  try {
    const upstream = await fetch(cloudinaryUrl, { cache: "no-store", redirect: "error" });
    if (!upstream.ok || !upstream.body) {
      console.error("Cloudinary attachment download failed", {
        attachmentId: id,
        status: upstream.status,
      });
      return Response.json({ message: "Unable to retrieve this attachment." }, { status: 502 });
    }

    const headers = new Headers({
      "Content-Type": attachment.mimeType,
      "Content-Disposition": createAttachmentContentDisposition(attachment.fileName),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    });
    const contentLength = upstream.headers.get("content-length");
    if (contentLength) headers.set("Content-Length", contentLength);

    return new Response(upstream.body, { status: 200, headers });
  } catch (error) {
    console.error("Failed to download chat attachment", { attachmentId: id, error });
    return Response.json({ message: "Unable to retrieve this attachment." }, { status: 502 });
  }
}
