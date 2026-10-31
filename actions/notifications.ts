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
