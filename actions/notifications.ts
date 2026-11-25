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
import { broadcastNotificationUpdates } from "@/lib/notification-realtime";
import { getActiveOrganizationId } from "@/lib/organization-authorization";

async function requireNotificationScope() {
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session?.user) {
    throw new ActionError("Sign in to view notifications.", 401);
  }
  const organizationId = await getActiveOrganizationId(requestHeaders);
  if (!organizationId) {
    throw new ActionError("Choose an organization to access notifications.", 403);
  }
  return { userId: session.user.id, organizationId };
}

export async function getMyNotificationsAction() {
  const { userId, organizationId } = await requireNotificationScope();
  return listUserNotifications(userId, organizationId);
}

export async function markNotificationReadAction(input: unknown) {
  const { userId, organizationId } = await requireNotificationScope();
  const { id } = z.object({ id: z.string().trim().min(1).max(100) }).parse(input);
  const result = await markUserNotificationRead(userId, organizationId, id);
  if (result.count > 0) await broadcastNotificationUpdates([userId]);
  return { success: true };
}

export async function markAllNotificationsReadAction() {
  const { userId, organizationId } = await requireNotificationScope();
  const result = await markAllUserNotificationsRead(userId, organizationId);
  if (result.count > 0) await broadcastNotificationUpdates([userId]);
  return { success: true };
}

export async function getWebPushPublicKeyAction() {
  await requireNotificationScope();
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
  const { userId } = await requireNotificationScope();
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
  const { userId } = await requireNotificationScope();
  const { endpoint } = z.object({
    endpoint: z.string().url().max(2048).startsWith("https://"),
  }).parse(input);
  await prisma.webPushSubscription.deleteMany({
    where: { userId, endpoint },
  });
  return { success: true };
}
