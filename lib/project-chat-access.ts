import {
  checkOrganizationPermission,
  getActiveOrganizationId,
} from "@/lib/organization-authorization";
import { canAccessProjectChatWithPermissions } from "@/lib/project-chat-policy";
import prisma from "@/lib/prisma";

export async function canAccessProjectChat(
  projectId: string,
  userId: string,
  requestHeaders: Headers,
): Promise<boolean> {
  const organizationId = await getActiveOrganizationId(requestHeaders);
  if (!organizationId) return false;

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      organizationId,
      deletedAt: null,
    },
    select: {
      projectManagerId: true,
      createdById: true,
      members: {
        where: { userId },
        select: { userId: true },
      },
    },
  });
  if (!project) return false;

  const [canReadAll, canReadAssigned, canReadOwn] = await Promise.all([
    checkOrganizationPermission({
      headers: requestHeaders,
      body: { permissions: { projects: ["read-all"] } },
    }),
    checkOrganizationPermission({
      headers: requestHeaders,
      body: { permissions: { projects: ["read-assigned"] } },
    }),
    checkOrganizationPermission({
      headers: requestHeaders,
      body: { permissions: { projects: ["read-own"] } },
    }),
  ]);

  return canAccessProjectChatWithPermissions({
    canReadAll: canReadAll.success,
    canReadAssigned: canReadAssigned.success,
    canReadOwn: canReadOwn.success,
    isAssigned: project.members.length > 0,
    isOwner:
      project.projectManagerId === userId || project.createdById === userId,
  });
}
