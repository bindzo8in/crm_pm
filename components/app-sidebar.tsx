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
  useSidebar,
} from "@/components/ui/sidebar"
import {
  Banknote,
  Box,
  BookUser,
  Building2,
  CalendarDays,
  CalendarHeart,
  CalendarOff,
  ChartNoAxesCombined,
  ClockIcon,
  FolderKanban,
  HandshakeIcon,
  Landmark,
  LayoutDashboardIcon,
  ListTodo,
  MessageSquareWarning,
  Package,
  ReceiptText,
  ScrollText,
  Settings2Icon,
  ShieldCheck,
  Tags,
  UsersIcon,
  WalletIcon,
} from "lucide-react"
import { env } from "@/lib/env"
import Image from "next/image"
import { useIsMobile } from "@/hooks/use-mobile"

const data = {
  navMain: [
    {
      title: "Dashboard",
      section: "Organization",
      url: "/dashboard",
      icon: (
        <LayoutDashboardIcon
        />
      ),
    },
    {
      title: "People & access",
      section: "Organization",
      url: "/dashboard/organization-management",
      icon: <ShieldCheck />,
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
      title: "Work schedule",
      section: "People",
      url: "/dashboard/attendance/schedule",
      icon: <CalendarDays />,
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
      title: "Members",
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
      title: "Service packages",
      section: "Catalog",
      url: "/dashboard/services/packages",
      icon: <Package />
    },
    {
      title: "Products",
      section: "Catalog",
      url: "/dashboard/products",
      icon: <Box />
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
      title: "Invoices",
      section: "Business",
      url: "/dashboard/invoices",
      icon: (
        <ReceiptText />
      )
    },
    {
      title: "Expenses",
      section: "Business",
      url: "/dashboard/finance",
      icon: <Banknote />
    },
    {
      title: "Reports",
      section: "Business",
      url: "/dashboard/reports",
      icon: <ChartNoAxesCombined />
    },
    {
      title: "Projects",
      section: "Activities",
      url: "/dashboard/projects",
      icon: <FolderKanban />
    },
    {
      title: "Tasks",
      section: "Activities",
      url: "/dashboard/tasks",
      icon: <ListTodo />
    },
    {
      title: "Issues & suggestions",
      section: "Support",
      url: "/dashboard/issues",
      icon: <MessageSquareWarning />,
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
  displayRole,
  allowedRoutes,
  organizationName,
  department,
  user,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  displayRole: "Owner" | "Admin" | "Staff"
  allowedRoutes: readonly string[]
  organizationName: string
  department?: string | null
  user: { name: string; email: string; avatar: string }
}) {
  const isMobile = useIsMobile()
  const [isTablet, setIsTablet] = React.useState(false)
  const { setOpen } = useSidebar()
  const setOpenRef = React.useRef(setOpen)
  const allowedRouteSet = new Set(allowedRoutes)
  const homeUrl = allowedRouteSet.has("/dashboard")
    ? "/dashboard"
    : allowedRouteSet.has("/attendance")
      ? "/attendance"
      : "/dashboard/organizations"

  React.useEffect(() => {
    setOpenRef.current = setOpen
  }, [setOpen])

  React.useEffect(() => {
    const tabletQuery = window.matchMedia("(min-width: 768px) and (max-width: 1023px)")
    const syncSidebar = () => {
      setIsTablet(tabletQuery.matches)
      setOpenRef.current(!tabletQuery.matches)
    }

    syncSidebar()
    tabletQuery.addEventListener("change", syncSidebar)
    return () => tabletQuery.removeEventListener("change", syncSidebar)
  }, [])

  const navMainItems = data.navMain.filter((item) => {
    if (item.url === "/dashboard/salary") {
      return allowedRouteSet.has("/dashboard/salary") ||
        allowedRouteSet.has("/dashboard/my-salary")
    }
    return allowedRouteSet.has(item.url)
  }).map((item) => {
    if (
      item.url === "/dashboard/salary" &&
      !allowedRouteSet.has("/dashboard/salary") &&
      allowedRouteSet.has("/dashboard/my-salary")
    ) {
      return { ...item, title: "My salary", url: "/dashboard/my-salary" };
    }
    return item;
  })
  const navSecondaryItems = data.navSecondary.filter((item) =>
    allowedRouteSet.has(item.url),
  )

  if (isMobile) {
    return (
      <MobileBottomNav
        items={navMainItems}
        secondaryItems={navSecondaryItems}
        user={user}
        role={displayRole}
        department={department}
      />
    )
  }

  return (
    <Sidebar
      collapsible={isTablet ? "icon" : "offcanvas"}
      className="tablet-sidebar"
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
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <a href="/dashboard/organizations">
                <Building2 />
                <span className="flex min-w-0 flex-col items-start">
                  <span className="max-w-48 truncate text-sm font-medium">
                    {organizationName}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Switch organization
                  </span>
                </span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain
          items={navMainItems}
          showQuickActions={allowedRouteSet.has("/dashboard/proposals")}
        />
        <NavSecondary items={navSecondaryItems} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} role={displayRole} department={department} />
      </SidebarFooter>
    </Sidebar>
  )
}
