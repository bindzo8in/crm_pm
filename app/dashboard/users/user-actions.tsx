"use client";

import { useState } from "react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  Copy,
  CopyCheck,
  MapPin,
  MoreHorizontal,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { toast } from "sonner";
import type { getUsers } from "@/actions/user";
import { ChangeWorkModeDialog } from "./change-work-mode-dialog";

type UserActionRow = Awaited<ReturnType<typeof getUsers>>["users"][number];

export function UserActions({
  user,
  canManageOrganization,
  canAssignWorkMode,
}: {
  user: UserActionRow;
  canManageOrganization: boolean;
  canAssignWorkMode: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [workModeDialogOpen, setWorkModeDialogOpen] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(user.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy the member ID. Copy it manually.");
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            aria-label={`Actions for ${user.name}`}
          >
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end">
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={onCopy}>
              {copied ? <CopyCheck /> : <Copy />}
              {copied ? "Copied" : "Copy"} ID
            </DropdownMenuItem>
            {canAssignWorkMode && (
              <DropdownMenuItem onSelect={() => setWorkModeDialogOpen(true)}>
                <MapPin />
                Assign work mode
              </DropdownMenuItem>
            )}
          </DropdownMenuGroup>

          {canManageOrganization && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuLabel>Organization access</DropdownMenuLabel>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/organization-management#members">
                    <UsersRound />
                    Manage role & team
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/organization-management#roles">
                    <ShieldCheck />
                    Manage role permissions
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <ChangeWorkModeDialog
        open={workModeDialogOpen}
        onOpenChange={setWorkModeDialogOpen}
        user={user}
      />
    </>
  );
}
