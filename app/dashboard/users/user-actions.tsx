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
    ReceiptIndianRupee,
    UserRoundCheck,
    UserRoundX,
} from "lucide-react";
import { ChangeRoleDialog } from "./change-role-dialog";
import { ChangeDepartmentDialog } from "./change-department-dialog";
import { ChangeWorkModeDialog } from "./change-work-mode-dialog";
import { EditPayrollDetailsDialog } from "./edit-payroll-details-dialog";
import { useSession } from "@/lib/auth-client";
import { EmploymentStatus, UserRole } from "@/app/generated/prisma/enums";
import {
    canAssignUserDepartment,
    canManageEmploymentStatus,
    canManageUser,
} from "@/lib/permissions";
import { OffboardEmployeeDialog } from "./offboard-employee-dialog";
import type { getUsers } from "@/actions/user";

type UserActionRow = Awaited<ReturnType<typeof getUsers>>["users"][number];

export const UserActions = ({ user }: { user: UserActionRow }) => {
    const { data: session } = useSession();
    const [copied, setCopied] = useState(false);
    const [roleDialogOpen, setRoleDialogOpen] = useState(false);
    const [deptDialogOpen, setDeptDialogOpen] = useState(false);
    const [workModeDialogOpen, setWorkModeDialogOpen] = useState(false);
    const [payrollDialogOpen, setPayrollDialogOpen] = useState(false);
    const [employmentDialogOpen, setEmploymentDialogOpen] = useState(false);

    const onCopy = async () => {
        await navigator.clipboard.writeText(user.id);

        setCopied(true);

        setTimeout(() => {
            setCopied(false);
        }, 2000);
    };
    const currentUserRole =
        (session?.user.role as UserRole | undefined) ?? UserRole.STAFF;
    const isMe = user.id === session?.user.id

    const canAssignDepartment = canAssignUserDepartment(
        currentUserRole,
        session?.user.department,
        user.role,
    );
    const canManageRole = canManageUser(currentUserRole, user.role);
    const canChangeWorkMode = canManageUser(currentUserRole, user.role);
        
    const canEditPayroll = 
        currentUserRole === UserRole.SUPER_ADMIN || 
        currentUserRole === UserRole.ADMIN;
    const canManageEmployment =
        !isMe &&
        canManageEmploymentStatus(
            currentUserRole,
            session?.user.department,
            user.role,
        );
    const isActive = user.employmentStatus === EmploymentStatus.ACTIVE;

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
                        onSelect={() => setEmploymentDialogOpen(true)}
                        disabled={!canManageEmployment}
                        variant={isActive ? "destructive" : "default"}
                    >
                        {isActive ? <UserRoundX /> : <UserRoundCheck />}
                        {isActive ? "Deactivate employee" : "Reactivate employee"}
                    </DropdownMenuItem>

                    <DropdownMenuItem
                        onSelect={() => {
                            setDeptDialogOpen(true);
                        }}
                        disabled={!canAssignDepartment || !isActive}
                    >
                        <Building2 />
                        Assign Department
                    </DropdownMenuItem>

                    <DropdownMenuItem
                        onSelect={() => {
                            setWorkModeDialogOpen(true);
                        }}
                        disabled={!canChangeWorkMode || !isActive}
                    >
                        <Building2 />
                        Change Work Mode
                    </DropdownMenuItem>

                    <DropdownMenuItem
                        onSelect={() => {
                            setRoleDialogOpen(true);
                        }}
                        disabled={!canManageRole || isMe || !isActive}
                    >
                        <UserKey />
                        Change Role
                    </DropdownMenuItem>

                    <DropdownMenuItem
                        onSelect={() => {
                            setPayrollDialogOpen(true);
                        }}
                        disabled={!canEditPayroll}
                    >
                        <ReceiptIndianRupee />
                        Edit Payroll Details
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

            <ChangeWorkModeDialog
                open={workModeDialogOpen}
                onOpenChange={setWorkModeDialogOpen}
                user={user}
                currentUserRole={currentUserRole}
                currentUserId={session?.user.id ?? ""}
            />

            <EditPayrollDetailsDialog
                open={payrollDialogOpen}
                onOpenChange={setPayrollDialogOpen}
                user={user}
            />

            <OffboardEmployeeDialog
                open={employmentDialogOpen}
                onOpenChange={setEmploymentDialogOpen}
                user={user}
            />
        </>
    );
};