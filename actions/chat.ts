"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { getNextChatReaction } from "@/lib/chat-reaction";
import prisma from "@/lib/prisma";

const attachmentSchema = z.object({
  url: z.string().url(),
  publicId: z.string().min(1).max(500),
  resourceType: z.enum(["image", "video", "raw"]),
  mimeType: z.string().min(1).max(200),
  fileName: z.string().min(1).max(255),
  fileSize: z.number().int().positive().max(25 * 1024 * 1024),
  width: z.number().int().positive().nullable().optional(),
  height: z.number().int().positive().nullable().optional(),
  duration: z.number().int().nonnegative().nullable().optional(),
});
const reactionSchema = z.string().trim().min(1).max(32);

function summarizeReactions(reactions: { emoji: string; userId: string }[], userId: string) {
  const grouped = new Map<string, { count: number; reacted: boolean }>();
  for (const reaction of reactions) {
    const current = grouped.get(reaction.emoji) ?? { count: 0, reacted: false };
    current.count += 1;
    current.reacted ||= reaction.userId === userId;
    grouped.set(reaction.emoji, current);
  }
  return [...grouped].map(([emoji, details]) => ({ emoji, ...details }));
}

async function currentUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) throw new Error("Sign in to use chat.");
  return session.user;
}

async function requireProjectMember(projectId: string, userId: string) {
  const membership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
  if (membership) return;

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { projectManagerId: true, createdById: true },
  });
  if (!project || (project.projectManagerId !== userId && project.createdById !== userId)) {
    throw new Error("You are not a member of this project.");
  }
}

export async function getProjectConversationAction(projectId: string) {
  const user = await currentUser();
  await requireProjectMember(projectId, user.id);
  const conversation = await prisma.conversation.upsert({
    where: { projectId },
    create: { type: "PROJECT", projectId },
    update: { deletedAt: null },
    select: { id: true },
  });
  await prisma.conversationMember.upsert({
    where: { conversationId_userId: { conversationId: conversation.id, userId: user.id } },
    create: { conversationId: conversation.id, userId: user.id },
    update: {},
  });
  return getConversationMessages(conversation.id, user.id);
}

export async function sendProjectMessageAction(input: unknown) {
  const { projectId, body, attachments, replyToId } = z.object({
    projectId: z.string().min(1),
    body: z.string().trim().max(5000),
    attachments: z.array(attachmentSchema).max(10).optional(),
    replyToId: z.string().min(1).optional(),
  }).parse(input);
  if (!body && (!attachments || attachments.length === 0)) throw new Error("Enter a message or select media.");
  const user = await currentUser();
  await requireProjectMember(projectId, user.id);
  const conversation = await prisma.conversation.upsert({
    where: { projectId },
    create: { type: "PROJECT", projectId },
    update: {},
  });
  if (replyToId) {
    const replyTarget = await prisma.chatMessage.findFirst({
      where: { id: replyToId, conversationId: conversation.id, deletedAt: null },
      select: { id: true },
    });
    if (!replyTarget) throw new Error("The message you are replying to is no longer available.");
  }
  const message = await prisma.chatMessage.create({
    data: {
      conversationId: conversation.id,
      senderId: user.id,
      body,
      replyToId: replyToId ?? null,
      attachments: attachments?.length ? {
        create: attachments.map((attachment) => ({
          url: attachment.url,
          publicId: attachment.publicId,
          resourceType: attachment.resourceType === "image" ? "IMAGE" : attachment.resourceType === "video" ? "VIDEO" : "RAW",
          mimeType: attachment.mimeType,
          fileName: attachment.fileName,
          fileSize: attachment.fileSize,
          width: attachment.width ?? null,
          height: attachment.height ?? null,
          duration: attachment.duration ?? null,
        })),
      } : undefined,
    },
    select: {
      id: true,
      body: true,
      createdAt: true,
      editedAt: true,
      sender: { select: { id: true, name: true, image: true } },
      replyTo: {
        select: {
          id: true,
          body: true,
          deletedAt: true,
          sender: { select: { name: true } },
          attachments: { where: { deletedAt: null }, select: { fileName: true }, take: 1 },
        },
      },
      reactions: { select: { emoji: true, userId: true } },
      attachments: {
        where: { deletedAt: null },
        select: {
          id: true, url: true, publicId: true, resourceType: true, mimeType: true,
          fileName: true, fileSize: true, width: true, height: true, duration: true,
          thumbnailUrl: true,
        },
      },
    },
  });
  await markConversationRead(conversation.id, user.id);
  return {
    success: true,
    message: {
      ...message,
      reactions: summarizeReactions(message.reactions, user.id),
      mine: true,
    },
  };
}

export async function toggleProjectMessageReactionAction(input: unknown) {
  const { projectId, messageId, emoji } = z.object({
    projectId: z.string().min(1),
    messageId: z.string().min(1),
    emoji: reactionSchema,
  }).parse(input);
  const user = await currentUser();
  await requireProjectMember(projectId, user.id);
  const conversation = await prisma.conversation.findUnique({
    where: { projectId },
    select: { id: true },
  });
  if (!conversation) throw new Error("Project conversation not found.");
  const message = await prisma.chatMessage.findFirst({
    where: { id: messageId, conversationId: conversation.id, deletedAt: null },
    select: { id: true },
  });
  if (!message) throw new Error("The message is no longer available.");

  const reactionKey = { messageId_userId: { messageId, userId: user.id } };
  await prisma.$transaction(async (transaction) => {
    const existing = await transaction.chatMessageReaction.findUnique({
      where: reactionKey,
      select: { emoji: true },
    });
    const nextEmoji = getNextChatReaction(existing?.emoji ?? null, emoji);
    if (!nextEmoji) {
      await transaction.chatMessageReaction.delete({ where: reactionKey });
    } else if (existing) {
      await transaction.chatMessageReaction.update({
        where: reactionKey,
        data: { emoji: nextEmoji },
      });
    } else {
      await transaction.chatMessageReaction.create({ data: { messageId, userId: user.id, emoji: nextEmoji } });
    }
  });

  const reactions = await prisma.chatMessageReaction.findMany({
    where: { messageId },
    select: { emoji: true, userId: true },
  });
  return {
    success: true,
    messageId,
    reactions: summarizeReactions(reactions, user.id),
  };
}

async function markConversationRead(conversationId: string, userId: string) {
  await prisma.conversationMember.upsert({
    where: { conversationId_userId: { conversationId, userId } },
    create: { conversationId, userId, lastReadAt: new Date() },
    update: { lastReadAt: new Date() },
  });
}

export async function markProjectChatReadAction(projectId: string) {
  const user = await currentUser();
  await requireProjectMember(projectId, user.id);
  const conversation = await prisma.conversation.findUnique({ where: { projectId }, select: { id: true } });
  if (conversation) await markConversationRead(conversation.id, user.id);
  return { success: true };
}

async function getConversationMessages(conversationId: string, userId: string) {
  await markConversationRead(conversationId, userId);
  const recentMessages = await prisma.chatMessage.findMany({
    where: { conversationId, deletedAt: null },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 100,
    select: {
      id: true,
      body: true,
      createdAt: true,
      editedAt: true,
      sender: { select: { id: true, name: true, image: true } },
      replyTo: {
        select: {
          id: true,
          body: true,
          deletedAt: true,
          sender: { select: { name: true } },
          attachments: { where: { deletedAt: null }, select: { fileName: true }, take: 1 },
        },
      },
      reactions: { select: { emoji: true, userId: true } },
      attachments: {
        where: { deletedAt: null },
        select: {
          id: true, url: true, publicId: true, resourceType: true, mimeType: true,
          fileName: true, fileSize: true, width: true, height: true, duration: true,
          thumbnailUrl: true,
        },
      },
    },
  });
  return {
    success: true,
    conversationId,
    messages: recentMessages.reverse().map(({ reactions, ...message }) => ({
      ...message,
      reactions: summarizeReactions(reactions, userId),
      mine: message.sender.id === userId,
    })),
  };
}
