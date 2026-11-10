import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset } from "@/components/ui/sidebar";
import DashboardProviders from "./providers";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { UserRole } from "@/app/generated/prisma/enums";
import { getInitialSetupStatus } from "@/lib/initial-setup";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
    const headersList = await headers();
    const session = await auth.api.getSession({
        headers: headersList
    });
    
    // Protect all dashboard routes if session is missing
    if (!session) {
        redirect("/signin");
    }

    if (
        session.user.role === UserRole.SUPER_ADMIN &&
        !(await getInitialSetupStatus()).complete
    ) {
        redirect("/onboarding");
    }

    const pathname = headersList.get("x-pathname") ?? "/dashboard";
    const isStaffWithoutDepartment =
        session.user.role === UserRole.STAFF && !session.user.department?.trim();
    const normalizedPathname = pathname.replace(/\/+$/, "");
    if (
        isStaffWithoutDepartment &&
        normalizedPathname !== "/dashboard" &&
        normalizedPathname !== "/dashboard/issues"
    ) {
        redirect("/dashboard");
    }

    return (
        <DashboardProviders>
            <AppSidebar
                userRole={session.user.role as UserRole}
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