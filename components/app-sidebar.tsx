"use client"

import * as React from "react"

import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { LayoutDashboardIcon, UsersIcon, FileTextIcon, Settings2Icon, CommandIcon, BookUser, BoxIcon, HandshakeIcon, ScrollText, TableIcon, ReceiptText, ClockIcon, CalendarHeart, CalendarOff, WalletIcon } from "lucide-react"
import { env } from "@/lib/env"
import { UserRole } from "@/app/generated/prisma/enums"
import { canReadFinance } from "@/lib/permissions"
import { canAccessRoute } from "@/lib/route-permissions"

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
      title: "Customers",
      section: "People",
      url: "/dashboard/customers",
      icon: (
        <BookUser />
      )
    },
    {
      title: "Services",
      section: "Catalog",
      url: "/dashboard/services",
      icon: (
        <FileTextIcon />
      )
    },
    {
      title: "Packages",
      section: "Catalog",
      url: "/dashboard/services/packages",
      icon: (
        <BoxIcon
        />
      ),
    },
    {
      title: "Tariffs",
      section: "Catalog",
      url: "/dashboard/tariffs",
      icon: (
        <TableIcon
        />
      ),
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
      title: "Salary",
      section: "Business",
      url: "/dashboard/salary",
      icon: (
        <WalletIcon />
      )
    },
    {
      title: "Invoice",
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
      icon: (
        <WalletIcon />
      )
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
        <BoxIcon
        />
      ),
    },
  ],
}

export function AppSidebar({
  userRole,
  user,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  userRole: UserRole
  user: { name: string; email: string; avatar: string }
}) {
  const navMainItems = data.navMain.filter((item) => {
    if (!canAccessRoute(item.url, userRole)) return false
    if (item.url === "/dashboard/finance") return canReadFinance(userRole)
    return true
  })
  const navSecondaryItems = data.navSecondary.filter((item) =>
    canAccessRoute(item.url, userRole)
  )

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
              <a href="/dashboard">
                <CommandIcon className="size-5!" />
                <span className="text-base font-semibold">{env.NEXT_PUBLIC_APP_NAME}</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMainItems} />
        <NavSecondary items={navSecondaryItems} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  )
}
