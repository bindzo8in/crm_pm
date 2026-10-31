import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import Link from "next/link"
import type { ReactNode } from "react"
import { ArrowLeft } from "lucide-react"
import { NotificationBell } from "@/components/notification-bell"

export function SiteHeader({ title, action, back, hideOnMobile = false }: { title: string, action?: { href: string, label: string, icon: ReactNode }, back?: { href: string, label?: string }, hideOnMobile?: boolean }) {
  return (
    <header className={`sticky top-0 z-30 ${hideOnMobile ? "hidden sm:flex" : "flex"} h-(--header-height) shrink-0 items-center border-b border-border/80 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)`}>
      <div className="flex w-full min-w-0 items-center justify-between gap-2 px-3 sm:px-4 lg:px-6">
        <div className="flex min-w-0 items-center">
          <SidebarTrigger className="-ml-1 hidden shrink-0 md:flex" />
          <Separator
            orientation="vertical"
            className="mx-2 hidden data-[orientation=vertical]:h-4 sm:block"
          />
          {back && (
            <Button
              asChild
              variant="ghost"
              size="icon"
              aria-label={back.label ?? "Go back"}
              className="mr-1 size-9 shrink-0"
            >
              <Link href={back.href}>
                <ArrowLeft aria-hidden="true" className="size-4" />
              </Link>
            </Button>
          )}
          <h1 className="truncate text-sm font-semibold tracking-tight sm:text-base">{title}</h1>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <NotificationBell />
          {action && (
            <Button
              asChild
              aria-label={action.label}
              className="h-9 shrink-0 gap-2 px-3 max-[420px]:size-9 max-[420px]:p-0"
            >
              <Link href={action.href}>
                <span aria-hidden="true" className="inline-flex">{action.icon}</span>
                <span className="max-[420px]:sr-only">{action.label}</span>
              </Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
