import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import DashboardProviders from "./providers";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <DashboardProviders>
            <AppSidebar variant="inset" />
            <SidebarInset>
                {children}
            </SidebarInset>
        </DashboardProviders>
    )
}