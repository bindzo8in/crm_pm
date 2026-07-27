"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    MoreHorizontalIcon,
    Copy,
    CopyCheck,
    UserKey,
    Building2,
} from "lucide-react";
import { ChangeRoleDialog } from "./change-role-dialog";
import { ChangeDepartmentDialog } from "./change-department-dialog";
import type { UserWithRole } from "better-auth/plugins/admin";
import { useSession } from "@/lib/auth-client";
import { UserRole } from "@/app/generated/prisma/enums";

export const UserActions = ({ user }: { user: UserWithRole }) => {
    const { data: session } = useSession();
    const [copied, setCopied] = useState(false);
    const [roleDialogOpen, setRoleDialogOpen] = useState(false);
    const [deptDialogOpen, setDeptDialogOpen] = useState(false);

    const onCopy = async () => {
        await navigator.clipboard.writeText(user.id);

        setCopied(true);

        setTimeout(() => {
            setCopied(false);
        }, 2000);
    };
    const currentUserRole = session?.user.role as UserRole ?? UserRole.STAFF

    const canManageRole =
        currentUserRole === UserRole.SUPER_ADMIN ||
        user.role !== UserRole.SUPER_ADMIN;
    const isMe = user.id === session?.user.id

    const canAssignDepartment =
        currentUserRole === UserRole.SUPER_ADMIN ||
        (currentUserRole === UserRole.ADMIN && user.role !== UserRole.SUPER_ADMIN);

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                    >
                        <MoreHorizontalIcon />
                        <span className="sr-only">Open menu</span>
                    </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={onCopy}>
                        {copied ? <CopyCheck /> : <Copy />}
                        {copied ? "Copied" : "Copy"} ID
                    </DropdownMenuItem>

                    <DropdownMenuItem
                        onSelect={() => {
                            setDeptDialogOpen(true);
                        }}
                        disabled={!canAssignDepartment}
                    >
                        <Building2 />
                        Assign Department
                    </DropdownMenuItem>

                    <DropdownMenuItem
                        onSelect={() => {
                            setRoleDialogOpen(true);
                        }}
                        disabled={!canManageRole || isMe}
                    >
                        <UserKey />
                        Change Role
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <ChangeRoleDialog
                open={roleDialogOpen}
                onOpenChange={setRoleDialogOpen}
                user={user}
                currentUserRole={currentUserRole}
                currentUserId={session?.user.id ?? ""}
            />

            <ChangeDepartmentDialog
                open={deptDialogOpen}
                onOpenChange={setDeptDialogOpen}
                user={user}
                currentUserRole={currentUserRole}
                currentUserId={session?.user.id ?? ""}
            />
        </>
    );
};