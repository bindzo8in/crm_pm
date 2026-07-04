import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset } from "@/components/ui/sidebar";
import DashboardProviders from "./providers";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { canAccessRoute } from "@/lib/route-permissions";
import { UserRole } from "@/app/generated/prisma/enums";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
    const headersList = await headers();
    const session = await auth.api.getSession({
        headers: headersList
    });
    
    // Protect all dashboard routes if session is missing
    if (!session) {
        redirect("/signin");
    }

    // Role-based access control based on injected x-pathname from middleware
    const pathname = headersList.get("x-pathname") || "/dashboard";
    const userRole = session.user.role as UserRole;
    
    if (!canAccessRoute(pathname, userRole)) {
        // Redirect unauthorized access to the main dashboard rather than sign-in
        redirect("/dashboard");
    }

    return (
        <DashboardProviders>
            <AppSidebar variant="inset" />
            <SidebarInset>
                {children}
            </SidebarInset>
        </DashboardProviders>
    )
}