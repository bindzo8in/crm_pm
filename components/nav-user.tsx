"use client"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { signOut, useSession } from "@/lib/auth-client"
import { EllipsisVerticalIcon, CircleUserRoundIcon, LogOutIcon } from "lucide-react"
import { useRouter } from "next/navigation"

export function NavUser({
  user,
  role,
  department,
}: {
  user: {
    name: string
    email: string
    avatar: string
  }
  role: string
  department?: string | null
}) {
  const { isMobile } = useSidebar()
  const { data: session } = useSession()

  const sessionUser = session?.user
  const displayName = sessionUser?.name || user.name
  const roleLabel = formatAccountLabel(role)
  const departmentLabel = formatAccountLabel(department)
  const initials = displayName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "U"

  const router = useRouter()

  const handleLogout = async () => {
    await signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push("/signin")
        },
        onError: () => {
          router.push("/signin")
        }
      }
    })
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="h-auto min-h-12 py-2 data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg grayscale">
                <AvatarImage src={sessionUser?.image || user.avatar} alt={sessionUser?.name || user.name} />
                <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
              </Avatar>
              <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
                <span className="flex min-w-0 items-center gap-1.5">
                  <span className="truncate font-medium" suppressHydrationWarning>{sessionUser?.name || user.name}</span>
                  <span className="shrink-0 truncate text-[11px] text-sidebar-foreground/80">({roleLabel})</span>
                </span>
                <span className="truncate text-xs text-muted-foreground">{departmentLabel}</span>
              </div>
              <EllipsisVerticalIcon className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={sessionUser?.image || user.avatar} alt={sessionUser?.name || user.name} />
                  <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
                </Avatar>
                <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span className="truncate font-medium" suppressHydrationWarning>{sessionUser?.name || user.name}</span>
                    <span className="shrink-0 truncate text-[11px] text-muted-foreground">({roleLabel})</span>
                  </span>
                  <span className="truncate text-xs text-muted-foreground">{departmentLabel}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => router.push('/dashboard/account')}>
                <CircleUserRoundIcon
                />
                Account
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOutIcon
              />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

function formatAccountLabel(value: string | null | undefined) {
  if (!value) return "Not assigned"

  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}
