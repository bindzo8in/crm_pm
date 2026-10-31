import prisma from "@/lib/prisma";

const notificationSelect = {
  id: true,
  title: true,
  message: true,
  href: true,
  readAt: true,
  createdAt: true,
} as const;

export async function listUserNotifications(userId: string) {
  const where = { userId };
  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 20,
      select: notificationSelect,
    }),
    prisma.notification.count({ where: { userId, readAt: null } }),
  ]);
  return { notifications, unreadCount };
}

export function markUserNotificationRead(userId: string, id: string) {
  return prisma.notification.updateMany({
    where: { id, userId, readAt: null },
    data: { readAt: new Date() },
  });
}

export function markAllUserNotificationsRead(userId: string) {
  return prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
}
