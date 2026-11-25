import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset } from "@/components/ui/sidebar";
import DashboardProviders from "./providers";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getInitialSetupStatus } from "@/lib/initial-setup";
import { isOrganizationSetupOwner } from "@/lib/organization-setup-access";
import { isPlatformSuperAdmin } from "@/lib/global-role";
import { checkOrganizationPermission } from "@/lib/organization-authorization";
import {
    getOrganizationRoutePermissions,
} from "@/lib/route-permissions";
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
                select: {
                    role: true,
                    organization: { select: { name: true } },
                },
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
    const membershipRoles = activeMembership?.role.split(",").map((role) => role.trim()) ?? [];
    const isOrganizationManager =
        membershipRoles.includes("owner") || membershipRoles.includes("admin");
    const displayRole =
        membershipRoles.includes("owner")
            ? "Owner"
            : isOrganizationManager
                ? "Admin"
                : "Staff";
    const navigationPaths = [
        "/dashboard",
        "/dashboard/organization-management",
        "/attendance",
        "/dashboard/attendance/schedule",
        "/dashboard/leaves",
        "/dashboard/holidays",
        "/dashboard/users",
        "/dashboard/salary",
        "/dashboard/my-salary",
        "/dashboard/services",
        "/dashboard/services/packages",
        "/dashboard/products",
        "/dashboard/tariffs",
        "/dashboard/terms",
        "/dashboard/proposals",
        "/dashboard/customers",
        "/dashboard/invoices",
        "/dashboard/finance",
        "/dashboard/reports",
        "/dashboard/projects",
        "/dashboard/tasks",
        "/dashboard/issues",
        "/dashboard/settings/business/company",
        "/dashboard/settings/business/banks",
    ];
    const allowedNavigationPaths = await Promise.all(
        [...new Set(navigationPaths)].map(async (path) => {
            if (path === "/dashboard/organization-management") {
                return isOrganizationManager ? path : null;
            }
            const permissions = getOrganizationRoutePermissions(path);
            if (!permissions) return path;
            const results = await Promise.all(
                permissions.map(({ resource, permission }) =>
                    checkOrganizationPermission({
                        headers: headersList,
                        body: { permissions: { [resource]: [permission] } },
                    }),
                ),
            );
            return results.some((result) => result.success) ? path : null;
        }),
    );

    return (
        <DashboardProviders>
            <AppSidebar
                displayRole={displayRole}
                allowedRoutes={allowedNavigationPaths.filter((path): path is string => path !== null)}
                organizationName={activeMembership?.organization.name ?? "Organization"}
                department={session.user.department}
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