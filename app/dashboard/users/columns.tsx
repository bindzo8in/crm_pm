"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { CheckCircle, XCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { UserActions } from "./user-actions"
import type { getUsers } from "@/actions/user"

type UserRow = Awaited<ReturnType<typeof getUsers>>["users"][number];

function formatRole(role: string) {
    return role.replace(/[-_]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function initials(name: string) {
    return name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part.charAt(0))
        .join("")
        .toUpperCase() || "U";
}

export function createUserColumns(canManageOrganization: boolean): ColumnDef<UserRow>[] {
  return [
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
            <Badge variant={row.original.role === "owner" ? "secondary" : "outline"}>
                {formatRole(row.original.role)}
            </Badge>
        )
    },
    {
        accessorKey: "teams",
        header: "Teams",
        cell: ({ row }) => {
            return (
                <div className="flex flex-wrap gap-1">
                    {row.original.teams.length > 0
                    ? row.original.teams.map((team) => (
                        <Badge
                            key={team.id}
                            variant="outline"
                            className="rounded-md px-2 py-0.5 text-xs font-medium"
                        >
                            {team.name}
                        </Badge>
                    ))
                    : (
                        <Badge variant="secondary" className="rounded-md px-2 py-0.5 text-xs font-medium">
                            No team
                        </Badge>
                    )}
                </div>
            );
        }
    },
    {
        accessorKey: "emailVerified",
        header: "Email verified",
        cell: ({ row }) =>
            row.original.emailVerified ? (
                <Badge variant="secondary" className="gap-1.5">
                    <CheckCircle />
                    Verified
                </Badge>
            ) : (
                <Badge variant="outline" className="gap-1.5">
                    <XCircle />
                    Not verified
                </Badge>
            ),
    },
    {
        accessorKey: "createdAt",
        header: "Joined",
        cell: ({ row }) => {
            const dateValue = row.original.createdAt;
            return new Intl.DateTimeFormat("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
            }).format(new Date(dateValue));
        },
    },
    {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
            <UserActions
                user={row.original}
                canManageOrganization={canManageOrganization}
            />
        )
    }
  ];
}