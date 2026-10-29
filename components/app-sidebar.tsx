"use client"

import * as React from "react"

import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import {
  Banknote,
  BookUser,
  CalendarHeart,
  CalendarOff,
  ChartNoAxesCombined,
  ClockIcon,
  FolderKanban,
  HandshakeIcon,
  Landmark,
  LayoutDashboardIcon,
  Package,
  ReceiptText,
  ScrollText,
  Settings2Icon,
  Tags,
  UsersIcon,
  WalletIcon,
} from "lucide-react"
import { env } from "@/lib/env"
import Image from "next/image"
import { UserRole } from "@/app/generated/prisma/enums"
import { canReadFinance } from "@/lib/permissions"
import { canAccessRoute } from "@/lib/route-permissions"
import { useIsMobile } from "@/hooks/use-mobile"

const data = {
  navMain: [
    {
      title: "Dashboard",
      section: "Workspace",
      url: "/dashboard",
      icon: (
        <LayoutDashboardIcon
        />
      ),
    },
    {
      title: "Attendance",
      section: "People",
      url: "/attendance",
      icon: (
        <ClockIcon />
      ),
    },
    {
      title: "Leaves",
      section: "People",
      url: "/dashboard/leaves",
      icon: (
        <CalendarOff />
      ),
    },
    {
      title: "Holidays",
      section: "People",
      url: "/dashboard/holidays",
      icon: (
        <CalendarHeart />
      ),
    },
    {
      title: "Users",
      section: "People",
      url: "/dashboard/users",
      icon: (
        <UsersIcon
        />
      ),
    },
    {
      title: "Salary",
      section: "People",
      url: "/dashboard/salary",
      icon: <WalletIcon />
    },
    {
      title: "Services",
      section: "Catalog",
      url: "/dashboard/services",
      icon: <Package />
    },
    {
      title: "Tariffs",
      section: "Catalog",
      url: "/dashboard/tariffs",
      icon: <Tags />,
    },
    {
      title: "Terms",
      section: "Catalog",
      url: "/dashboard/terms",
      icon: (
        <HandshakeIcon
        />
      ),
    },
    {
      title: "Proposals",
      section: "Business",
      url: "/dashboard/proposals",
      icon: (
        <ScrollText
        />
      ),
    },
    {
      title: "Customers",
      section: "Business",
      url: "/dashboard/customers",
      icon: <BookUser />
    },
    {
      title: "Projects",
      section: "Business",
      url: "/dashboard/projects",
      icon: <FolderKanban />
    },
    {
      title: "Invoices",
      section: "Business",
      url: "/dashboard/invoices",
      icon: (
        <ReceiptText />
      )
    },
    {
      title: "Finance",
      section: "Business",
      url: "/dashboard/finance",
      icon: <Banknote />
    },
    {
      title: "Reports",
      section: "Business",
      url: "/dashboard/reports",
      icon: <ChartNoAxesCombined />
    }
  ],
  navSecondary: [
    {
      title: "Company Profile",
      url: "/dashboard/settings/business/company",
      icon: (
        <Settings2Icon
        />
      ),
    },
    {
      title: "Bank Accounts",
      url: "/dashboard/settings/business/banks",
      icon: (
        <Landmark
        />
      ),
    },
  ],
}

export function AppSidebar({
  userRole,
  department,
  user,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  userRole: UserRole
  department?: string | null
  user: { name: string; email: string; avatar: string }
}) {
  const isMobile = useIsMobile()
  const homeUrl = "/dashboard"
  const hasWorkspaceAccess =
    userRole !== UserRole.STAFF || Boolean(department?.trim())
  const navMainItems = data.navMain.filter((item) => {
    if (item.url === "/dashboard") return true
    if (!hasWorkspaceAccess) return false
    if (!canAccessRoute(item.url, userRole, department)) return false
    if (item.url === "/dashboard/finance") return canReadFinance(userRole)
    return true
  })
  const navSecondaryItems = hasWorkspaceAccess
    ? data.navSecondary.filter((item) => canAccessRoute(item.url, userRole, department))
    : []

  if (isMobile) {
    return <MobileBottomNav items={navMainItems} secondaryItems={navSecondaryItems} />
  }

  return (
    <Sidebar
      collapsible="offcanvas"
      className="[--sidebar:#111b2d] [--sidebar-foreground:#f1f5f9] [--sidebar-primary:#5b4bea] [--sidebar-primary-foreground:#ffffff] [--sidebar-accent:#202e43] [--sidebar-accent-foreground:#ffffff] [--sidebar-border:#2d3b50] [--sidebar-ring:#a5b4fc]"
      {...props}
    >
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:p-1.5!"
            >
              <a href={homeUrl}>
                <Image src="/logo.png" alt="" width={28} height={28} className="size-7 shrink-0 object-contain" />
                <span className="text-base font-semibold">{env.NEXT_PUBLIC_APP_NAME}</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain
          items={navMainItems}
          showQuickActions={canAccessRoute("/dashboard/proposals", userRole, department)}
        />
        <NavSecondary items={navSecondaryItems} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} role={userRole} department={department} />
      </SidebarFooter>
    </Sidebar>
  )
}
