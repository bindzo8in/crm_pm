export const metadata = {
  title: "Dashboard"
};

import { AppSidebar } from "@/components/app-sidebar"
import { ChartAreaInteractive } from "@/components/chart-area-interactive"
import { DataTable } from "@/components/data-table.backup"
import { SectionCards } from "@/components/section-cards"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

import data from "./data.json"
import DashboardContainer from "./dashboard-container"
import { requirePageAccess } from "@/lib/auth-guard"

export default async function Page() {
  await requirePageAccess("/dashboard")

  return (
    <DashboardContainer title="Dashboard">
      <SectionCards />
      <div className="px-4 lg:px-6">
        <ChartAreaInteractive />
      </div>
      <DataTable data={data} />
    </DashboardContainer>
  )
}
