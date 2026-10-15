"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { CirclePlusIcon, Eye } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

export function NavMain({
  items,
}: {
  items: {
    title: string
    url: string
    section?: string
    icon?: React.ReactNode
  }[]
}) {
  const pathname = usePathname()
  const { isMobile, setOpenMobile } = useSidebar()
  const closeMobileNav = () => {
    if (isMobile) setOpenMobile(false)
  }

  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">
        <SidebarMenu>
          <SidebarMenuItem className="flex items-center gap-1.5">
            <SidebarMenuButton
              asChild
              tooltip="Create Quotation"
              className="flex-1 min-w-0 bg-primary text-primary-foreground duration-200 ease-linear hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground"
            >
              <Link href="/dashboard/proposals/create" onClick={closeMobileNav}>
                <CirclePlusIcon />
                <span className="truncate">Create Quotation</span>
              </Link>
            </SidebarMenuButton>
            <Button
              asChild
              size="icon"
              variant="ghost"
              className="size-8 shrink-0 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:hidden"
            >
              <Link href="/dashboard/proposals" aria-label="View quotations" title="View Quotations" onClick={closeMobileNav}>
                <Eye className="size-4" />
                <span className="sr-only">View Quotations</span>
              </Link>
            </Button>
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarMenu>
          {items.map((item, index) => {
            const isActive = item.url === pathname || (item.url !== "/dashboard" && pathname.startsWith(`${item.url}/`))
            const startsSection = item.section && item.section !== items[index - 1]?.section

            return (
              <React.Fragment key={item.title}>
                {startsSection && (
                  <SidebarGroupLabel className="h-7 px-2 pt-2 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/45 group-data-[collapsible=icon]:hidden">
                    {item.section}
                  </SidebarGroupLabel>
                )}
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    tooltip={item.title}
                    isActive={isActive}
                  >
                    <Link href={item.url} aria-current={isActive ? "page" : undefined} onClick={closeMobileNav}>
                      {item.icon}
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </React.Fragment>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
