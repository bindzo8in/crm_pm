import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { UserRole, Department } from "@/app/generated/prisma/enums";

export interface AttendanceUserPermissions {
  session: any;
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
    role: UserRole;
    department: Department | null;
    createdAt: Date;
  };
  isAuthorized: boolean;
  hasDepartment: boolean;
}

/**
 * Ensures user is authenticated and has permission to access the Attendance Portal:
 * Must have a staff/admin role and belong to an assigned department.
 */
export async function requireAttendanceAccess(): Promise<AttendanceUserPermissions> {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({
    headers: reqHeaders,
  });

  if (!session || !session.user) {
    redirect("/signin");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      department: true,
      createdAt: true,
    },
  });

  if (!user) {
    redirect("/signin");
  }

  const isAdminOrSuperAdmin = user.role === UserRole.SUPER_ADMIN || user.role === UserRole.ADMIN;
  const isAuthorized = isAdminOrSuperAdmin || !!(user.role && user.department);

  return {
    session,
    user,
    isAuthorized,
    hasDepartment: !!user.department,
  };
}
