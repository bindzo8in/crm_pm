"use client"

import * as React from "react"
import Link from "next/link"
import { useHydratedPathname } from "@/hooks/use-hydrated-pathname"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

export function NavSecondary({
  items,
  ...props
}: {
  items: {
    title: string
    url: string
    icon: React.ReactNode
  }[]
} & React.ComponentPropsWithoutRef<typeof SidebarGroup>) {
  const pathname = useHydratedPathname()
  const { isMobile, setOpenMobile } = useSidebar()
  const closeMobileNav = () => {
    if (isMobile) setOpenMobile(false)
  }

  return (
    <SidebarGroup {...props}>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                asChild
                isActive={pathname !== null && (
                  item.url === pathname || pathname.startsWith(`${item.url}/`)
                )}
              >
                <Link
                  href={item.url}
                  aria-current={
                    pathname !== null &&
                    (item.url === pathname || pathname.startsWith(`${item.url}/`))
                      ? "page"
                      : undefined
                  }
                  onClick={closeMobileNav}
                >
                  {item.icon}
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
