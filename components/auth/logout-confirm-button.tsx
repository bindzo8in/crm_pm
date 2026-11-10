"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOutIcon } from "lucide-react";
import { toast } from "sonner";
import { signOut } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function LogoutConfirmButton() {
  const router = useRouter();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut({
        fetchOptions: {
          onSuccess: () => {
            setIsConfirmOpen(false);
            router.replace("/signin");
          },
          onError: (context) => {
            toast.error(context.error.message || "Failed to log out");
            setIsLoggingOut(false);
          },
        },
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to log out");
      setIsLoggingOut(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        aria-label={isLoggingOut ? "Logging out" : "Log out"}
        title={isLoggingOut ? "Logging out" : "Log out"}
        className="size-9 shrink-0 justify-center rounded-xl p-0 text-[11px] font-semibold shadow-sm sm:h-9 sm:w-auto sm:rounded-2xl sm:px-3 sm:text-xs"
        onClick={() => setIsConfirmOpen(true)}
        disabled={isLoggingOut}
      >
        <LogOutIcon aria-hidden="true" className="size-4 shrink-0 sm:mr-1.5" />
        <span className="sr-only sm:not-sr-only">
          {isLoggingOut ? "Logging out..." : "Log out"}
        </span>
      </Button>

      <AlertDialog
        open={isConfirmOpen}
        onOpenChange={(open) => {
          if (!isLoggingOut) setIsConfirmOpen(open);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Log out of your account?</AlertDialogTitle>
            <AlertDialogDescription>
              You will need to sign in again to access your account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoggingOut}>Cancel</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void handleLogout()}
              disabled={isLoggingOut}
            >
              {isLoggingOut ? "Logging out..." : "Log out"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
