import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset } from "@/components/ui/sidebar";
import DashboardProviders from "./providers";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { UserRole } from "@/app/generated/prisma/enums";
import { getInitialSetupStatus } from "@/lib/initial-setup";
import { isOrganizationSetupOwner } from "@/lib/organization-setup-access";
import { isPlatformSuperAdmin } from "@/lib/global-role";
import { checkOrganizationPermission } from "@/lib/organization-authorization";
import prisma from "@/lib/prisma";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
    const headersList = await headers();
    const session = await auth.api.getSession({
        headers: headersList
    });
    
    // Protect all dashboard routes if session is missing
    if (!session) {
        redirect("/signin");
    }
    if (isPlatformSuperAdmin(session.user.role)) {
        redirect("/platform/organizations");
    }

    const pathname = headersList.get("x-pathname") ?? "/dashboard";
    const activeOrganizationId = session.session.activeOrganizationId;
    if (!activeOrganizationId) {
        const memberships = await prisma.member.findMany({
            where: { userId: session.user.id },
            select: { organizationId: true },
            take: 2,
        });
        if (memberships.length === 1) {
            await auth.api.setActiveOrganization({
                headers: headersList,
                body: { organizationId: memberships[0].organizationId },
            });
            redirect(pathname);
        }
        if (pathname !== "/dashboard/organizations") {
            redirect("/dashboard/organizations");
        }
    }

    const activeMembership = activeOrganizationId
        ? await prisma.member.findUnique({
            where: {
                organizationId_userId: {
                    organizationId: activeOrganizationId,
                    userId: session.user.id,
                },
            },
            select: { role: true },
        })
        : null;
    if (activeOrganizationId && !activeMembership && pathname !== "/dashboard/organizations") {
        redirect("/dashboard/organizations");
    }
    if (
        activeOrganizationId &&
        isOrganizationSetupOwner(activeMembership?.role) &&
        !(await getInitialSetupStatus(activeOrganizationId)).complete
    ) {
        redirect("/onboarding");
    }
    let attendanceNavPermissions = {
        canReadAttendance: false,
        canManageAttendance: false,
    };
    if (activeOrganizationId) {
        const [canReadOwn, canReadAll, canManage] = await Promise.all([
            checkOrganizationPermission({
                headers: headersList,
                body: { permissions: { attendance: ["read-own"] } },
            }),
            checkOrganizationPermission({
                headers: headersList,
                body: { permissions: { attendance: ["read-all"] } },
            }),
            checkOrganizationPermission({
                headers: headersList,
                body: { permissions: { attendance: ["manage"] } },
            }),
        ]);
        attendanceNavPermissions = {
            canReadAttendance: canReadOwn.success || canReadAll.success,
            canManageAttendance: canManage.success,
        };
    }
    const membershipRoles = activeMembership?.role.split(",").map((role) => role.trim()) ?? [];
    const isOrganizationManager =
        membershipRoles.includes("owner") || membershipRoles.includes("admin");
    const sidebarRole =
        isOrganizationManager
            ? UserRole.ADMIN
            : UserRole.STAFF;
    const displayRole =
        membershipRoles.includes("owner")
            ? "Owner"
            : sidebarRole === UserRole.ADMIN
                ? "Admin"
                : "Staff";

    return (
        <DashboardProviders>
            <AppSidebar
                userRole={sidebarRole}
                displayRole={displayRole}
                department={session.user.department}
                {...attendanceNavPermissions}
                user={{
                    name: session.user.name,
                    email: session.user.email,
                    avatar: session.user.image ?? "/logo.png",
                }}
                variant="inset"
            />
            <SidebarInset>
                {children}
            </SidebarInset>
        </DashboardProviders>
    )
}