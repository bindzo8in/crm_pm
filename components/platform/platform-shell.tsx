"use client";

import { signOut } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";

export function PlatformShell({
  user,
  children,
}: {
  user: { name: string; email: string };
  children: ReactNode;
}) {
  const router = useRouter();
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
        <div className="mx-auto flex min-h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-8">
          <div className="min-w-0">
            <p className="font-heading text-lg font-semibold tracking-tight">
              Bindzo8 <span className="text-primary">Platform</span>
            </p>
            <p className="hidden truncate text-xs text-muted-foreground sm:block">
              {user.name} · {user.email}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
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
