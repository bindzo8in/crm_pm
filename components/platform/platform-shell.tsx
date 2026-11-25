"use client";

import { signOut } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Building2, LogOut, Users } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PlatformShell({
  user,
  children,
}: {
  user: { name: string; email: string };
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [signOutFailed, setSignOutFailed] = useState(false);

  async function handleSignOut() {
    await signOut({
      fetchOptions: {
        onSuccess: () => router.push("/signin"),
        onError: () => setSignOutFailed(true),
      },
    });
  }

  return (
    <div className="min-h-svh bg-muted/20">
      <header className="border-b bg-background">
        <div className="mx-auto flex min-h-16 w-full max-w-7xl flex-wrap items-center justify-between gap-4 px-4 sm:px-8">
          <div className="min-w-0 shrink-0">
            <p className="font-heading text-lg font-semibold tracking-tight">
              Bindzo8 <span className="text-primary">Platform</span>
            </p>
            <p className="hidden truncate text-xs text-muted-foreground sm:block">
              {user.name} · {user.email}
            </p>
          </div>
          <nav
            aria-label="Platform navigation"
            className="order-3 flex w-full items-center gap-2 sm:order-2 sm:w-auto"
          >
            <Link
              href="/platform/organizations"
              aria-current={
                pathname.startsWith("/platform/organizations") ? "page" : undefined
              }
              className={cn(
                "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                pathname.startsWith("/platform/organizations")
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
              )}
            >
              <Building2 />
              Organizations
            </Link>
            <Link
              href="/platform/users"
              aria-current={pathname.startsWith("/platform/users") ? "page" : undefined}
              className={cn(
                "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                pathname.startsWith("/platform/users")
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
              )}
            >
              <Users />
              Users
            </Link>
          </nav>
          <div className="order-2 flex flex-col items-end gap-1 sm:order-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
            >
              <LogOut className="mr-2 size-4" />
              Sign out
            </Button>
            {signOutFailed && (
              <p role="alert" className="text-xs text-destructive">
                Could not sign out. Please try again.
              </p>
            )}
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
