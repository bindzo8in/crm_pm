import prisma from "@/lib/prisma";

const notificationSelect = {
  id: true,
  title: true,
  message: true,
  href: true,
  readAt: true,
  createdAt: true,
} as const;

export async function listUserNotifications(userId: string, organizationId: string) {
  const where = { userId, organizationId };
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

export function markUserNotificationRead(
  userId: string,
  organizationId: string,
  id: string,
) {
  return prisma.notification.updateMany({
    where: { id, userId, organizationId, readAt: null },
    data: { readAt: new Date() },
  });
}

export function markAllUserNotificationsRead(userId: string, organizationId: string) {
  return prisma.notification.updateMany({
    where: { userId, organizationId, readAt: null },
    data: { readAt: new Date() },
  });
}
