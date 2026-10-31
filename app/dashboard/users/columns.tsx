"use client"

import { ColumnDef } from "@tanstack/react-table"
import { CheckCircle, XCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { UserActions } from "./user-actions"
import { format } from "date-fns"
import { getUsers } from "@/actions/user"
import { EmploymentStatus } from "@/app/generated/prisma/enums"

type UserRow = Awaited<ReturnType<typeof getUsers>>["users"][number];

function initials(name: string) {
    return name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part.charAt(0))
        .join("")
        .toUpperCase() || "U";
}

export const columns: ColumnDef<UserRow>[] = [
    {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => (
            <div className="flex items-center gap-3">
                <Avatar className="size-9 border bg-muted">
                    {row.original.image && <AvatarImage src={row.original.image} alt="" />}
                    <AvatarFallback className="text-xs font-semibold">
                        {initials(row.original.name)}
                    </AvatarFallback>
                </Avatar>
                <span className="max-w-44 truncate font-medium">{row.original.name}</span>
            </div>
        ),
    },
    {
        accessorKey: "email",
        header: "Email",
    },
    {
        accessorKey: "role",
        header: "Role",
        cell: ({ row }) => (
            <div className="flex items-center gap-x-2">
                {row.original.role ? row.original.role : "-"}
            </div>
        )
    },
    {
        accessorKey: "department",
        header: "Department",
        cell: ({ row }) => (
            <Badge variant="secondary" className="rounded-md px-2 py-0.5 text-xs font-medium">
                {row.original.department ?? "Unassigned"}
            </Badge>
        )
    },
    {
        accessorKey: "employmentStatus",
        header: "Employment",
        cell: ({ row }) => {
            const isActive = row.original.employmentStatus === EmploymentStatus.ACTIVE;
            return (
                <div className="space-y-1">
                    <Badge
                        variant="outline"
                        className={isActive ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}
                    >
                        {isActive ? "Active" : "Inactive"}
                    </Badge>
                    {!isActive && row.original.employmentEndedAt && (
                        <p className="text-xs text-muted-foreground">
                            Since {format(new Date(row.original.employmentEndedAt), "dd/MM/yyyy")}
                        </p>
                    )}
                </div>
            );
        },
    },
    {
        accessorKey: "workMode",
        header: "Work Mode",
        cell: ({ row }) => (
            <Badge variant="secondary" className="text-xs">
                {row.original.workMode ?? "OFFICE"}
            </Badge>
        )
    },
    {
        accessorKey: "emailVerified",
        header: "Email Verified",
        cell: ({ row }) => (
            <>
                {row.original.emailVerified ? (
                    <div className="flex items-center gap-x-2">
                        <CheckCircle className="size-4 text-green-500" />
                        <span className="text-sm font-medium text-green-500">Yes</span>
                    </div>
                ) : (
                    <div className="flex items-center gap-x-2">
                        <XCircle className="size-4 text-red-500" />
                        <span>No</span>
                    </div>
                )}
            </>
        )
    },
    {
        accessorKey: "createdAt",
        header: "Created At",
        cell: ({ row }) => {
            const dateValue = row.getValue("createdAt") as Date;
            if (!dateValue) return "N/A";
            return format(new Date(dateValue), "dd/MM/yyyy");
        },
    },
    {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => <UserActions user={row.original} />
    }
]