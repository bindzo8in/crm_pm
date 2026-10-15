import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset } from "@/components/ui/sidebar";
import DashboardProviders from "./providers";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
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


    return (
        <DashboardProviders>
            <AppSidebar
                userRole={session.user.role as UserRole}
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