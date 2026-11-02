"use server";

import { auth } from "@/lib/auth";
import { ActionError } from "@/lib/action-error";
import {
  listUserNotifications,
  markAllUserNotificationsRead,
  markUserNotificationRead,
} from "@/repositories/notification-repository";
import { headers } from "next/headers";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { env } from "@/lib/env";

async function requireNotificationUserId() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    throw new ActionError("Sign in to view notifications.", 401);
  }
  return session.user.id;
}

export async function getMyNotificationsAction() {
  const userId = await requireNotificationUserId();
  return listUserNotifications(userId);
}

export async function markNotificationReadAction(input: unknown) {
  const userId = await requireNotificationUserId();
  const { id } = z.object({ id: z.string().trim().min(1).max(100) }).parse(input);
  await markUserNotificationRead(userId, id);
  return { success: true };
}

export async function markAllNotificationsReadAction() {
  const userId = await requireNotificationUserId();
  await markAllUserNotificationsRead(userId);
  return { success: true };
}

export async function getWebPushPublicKeyAction() {
  await requireNotificationUserId();
  return {
    publicKey: env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY
      ? env.VAPID_PUBLIC_KEY
      : null,
  };
}

const webPushSubscriptionSchema = z.object({
  endpoint: z.string().url().max(2048).startsWith("https://"),
  keys: z.object({
    p256dh: z.string().min(1).max(256),
    auth: z.string().min(1).max(256),
  }),
});

export async function saveWebPushSubscriptionAction(input: unknown) {
  const userId = await requireNotificationUserId();
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) {
    throw new ActionError("Browser reminders are not configured on this server.", 503);
  }
  const subscription = webPushSubscriptionSchema.parse(input);
  const existing = await prisma.webPushSubscription.findUnique({
    where: { endpoint: subscription.endpoint },
    select: { id: true, userId: true },
  });

  if (existing && existing.userId !== userId) {
    throw new ActionError("This browser subscription is already linked to another account.", 409);
  }

  if (existing) {
    await prisma.webPushSubscription.update({
      where: { id: existing.id },
      data: {
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
    });
  } else {
    await prisma.webPushSubscription.create({
      data: {
        userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
    });
  }

  return { success: true };
}

export async function removeWebPushSubscriptionAction(input: unknown) {
  const userId = await requireNotificationUserId();
  const { endpoint } = z.object({
    endpoint: z.string().url().max(2048).startsWith("https://"),
  }).parse(input);
  await prisma.webPushSubscription.deleteMany({
    where: { userId, endpoint },
  });
  return { success: true };
}
