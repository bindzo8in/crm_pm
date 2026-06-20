"use client"

import { ColumnDef } from "@tanstack/react-table"
import { CheckCircle, XCircle } from "lucide-react"
import { UserActions } from "./user-actions"
import { format } from "date-fns"
import { getUsers } from "@/actions/user"

type UserRow = Awaited<ReturnType<typeof getUsers>>["users"][number];

export const columns: ColumnDef<UserRow>[] = [
    {
        accessorKey: "name",
        header: "Name",
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