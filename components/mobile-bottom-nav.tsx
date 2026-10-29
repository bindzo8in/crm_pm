"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useRef, useState } from "react"
import { Ellipsis, LayoutDashboard, ReceiptText, Users, ChartNoAxesCombined } from "lucide-react"

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

type NavigationItem = {
  title: string
  url: string
  section?: string
  icon?: React.ReactNode
}

const primaryOrder = ["Dashboard", "Invoices", "Customers", "Reports"]
const primaryIcons: Record<string, React.ReactNode> = {
  Dashboard: <LayoutDashboard aria-hidden="true" className="size-5" />,
  Invoices: <ReceiptText aria-hidden="true" className="size-5" />,
  Customers: <Users aria-hidden="true" className="size-5" />,
  Reports: <ChartNoAxesCombined aria-hidden="true" className="size-5" />,
}

function isItemActive(item: NavigationItem, pathname: string) {
  return item.url === "/dashboard"
    ? pathname === item.url
    : pathname === item.url || pathname.startsWith(`${item.url}/`)
}

export function MobileBottomNav({
  items,
  secondaryItems,
}: {
  items: NavigationItem[]
  secondaryItems: NavigationItem[]
}) {
  const pathname = usePathname()
  const [isMoreOpen, setIsMoreOpen] = useState(false)
  const swipeStartY = useRef<number | null>(null)
  const orderedItems = primaryOrder
    .map((title) => items.find((item) => item.title === title))
    .filter((item): item is NavigationItem => item !== undefined)
  const primaryItems = [
    ...orderedItems,
    ...items.filter((item) => !primaryOrder.includes(item.title)),
  ].slice(0, 4)
  const primaryUrls = new Set(primaryItems.map((item) => item.url))
  const moreItems = items.filter((item) => !primaryUrls.has(item.url))
  const remainingItems = [...moreItems, ...secondaryItems]
  const isMoreActive = remainingItems.some((item) => isItemActive(item, pathname))

  return (
    <Sheet open={isMoreOpen} onOpenChange={setIsMoreOpen}>
      <nav
        aria-label="Mobile navigation"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-background/95 px-2 pt-1.5 shadow-[0_-8px_24px_rgba(15,23,42,0.06)] backdrop-blur supports-[backdrop-filter]:bg-background/85 md:hidden"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0.5rem)" }}
      >
        <ul
          className="mx-auto grid max-w-lg"
          style={{ gridTemplateColumns: `repeat(${primaryItems.length + 1}, minmax(0, 1fr))` }}
        >
          {primaryItems.map((item) => {
            const active = isItemActive(item, pathname)

            return (
              <li key={item.url}>
                <Link
                  href={item.url}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-lg px-1 text-[10px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring ${
                    active
                      ? "text-primary"
                      : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                  }`}
                >
                  {primaryIcons[item.title] ?? item.icon}
                  <span className="max-w-full truncate">{item.title}</span>
                </Link>
              </li>
            )
          })}
          <li>
            <button
              type="button"
              aria-haspopup="dialog"
              aria-expanded={isMoreOpen}
              onClick={() => setIsMoreOpen(true)}
              className={`flex min-h-12 w-full flex-col items-center justify-center gap-0.5 rounded-lg px-1 text-[10px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring ${
                isMoreActive || isMoreOpen
                  ? "text-primary"
                  : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
              }`}
            >
              <Ellipsis aria-hidden="true" className="size-5" />
              <span>More</span>
            </button>
          </li>
        </ul>
      </nav>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="max-h-[80svh] gap-0 overflow-y-auto rounded-t-2xl pb-[max(env(safe-area-inset-bottom),1rem)]"
      >
        <button
          type="button"
          aria-label="Swipe down or tap to close menu"
          onClick={() => setIsMoreOpen(false)}
          onPointerDown={(event) => {
            swipeStartY.current = event.clientY
            event.currentTarget.setPointerCapture(event.pointerId)
          }}
          onPointerUp={(event) => {
            if (swipeStartY.current !== null && event.clientY - swipeStartY.current > 40) {
              setIsMoreOpen(false)
            }
            swipeStartY.current = null
          }}
          onPointerCancel={() => {
            swipeStartY.current = null
          }}
          className="flex h-7 w-full shrink-0 touch-none items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        >
          <span aria-hidden="true" className="h-1 w-10 rounded-full bg-muted-foreground/30" />
        </button>
        <SheetHeader className="border-b px-5 pb-4 pt-0">
          <SheetTitle>More</SheetTitle>
          <SheetDescription>Open another part of your workspace.</SheetDescription>
        </SheetHeader>
        <div className="space-y-5 overflow-y-auto px-4 py-4">
          {[
            { label: "Workspace", items: moreItems },
            { label: "Settings", items: secondaryItems },
          ].map((section) => section.items.length > 0 && (
            <section key={section.label} aria-label={section.label}>
              <h2 className="px-2 pb-2 text-xs font-medium text-muted-foreground">{section.label}</h2>
              <ul className="grid grid-cols-2 gap-2">
                {section.items.map((item) => {
                  const active = isItemActive(item, pathname)

                  return (
                    <li key={item.url}>
                      <Link
                        href={item.url}
                        aria-current={active ? "page" : undefined}
                        onClick={() => setIsMoreOpen(false)}
                        className={`flex min-h-12 items-center gap-3 rounded-lg border px-3 py-2 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring ${
                          active
                            ? "border-primary/30 bg-primary/5 font-medium text-primary"
                            : "border-border/70 hover:bg-muted/60"
                        }`}
                      >
                        <span className="shrink-0">{item.icon}</span>
                        <span className="truncate">{item.title}</span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
          {remainingItems.length === 0 && (
            <p className="px-2 text-sm text-muted-foreground">All available sections are shown in the navigation bar.</p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
