"use client";

import { Badge } from "@/components/ui/badge";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  Building2Icon,
  CalendarIcon,
  CheckCircle2Icon,
  ShieldCheckIcon,
  SparklesIcon,
} from "lucide-react";
import { formatInIST } from "@/lib/date";

export interface ProfileOverviewUser {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: string;
  department: string | null;
  additionalDepartments: string[];
  createdAt: string | Date;
}

export function ProfileOverviewCard({
  user,
  showAttendanceAccess = false,
}: {
  user: ProfileOverviewUser;
  showAttendanceAccess?: boolean;
}) {
  const departments = [
    ...new Set([
      ...(user.department ? [user.department] : []),
      ...user.additionalDepartments,
    ]),
  ];
  const formattedDate = user.createdAt
    ? formatInIST(new Date(user.createdAt), "MMM d, yyyy")
    : "N/A";

  return (
    <section className="relative overflow-hidden rounded-3xl border border-border/70 bg-card">
      <div className="absolute inset-y-0 left-0 w-1 bg-primary" />

      <div className="flex flex-col gap-5 p-5 pl-6 sm:flex-row sm:items-center sm:gap-6 sm:p-7 sm:pl-8">
        <div className="relative shrink-0 self-start">
          <Avatar className="size-20 rounded-2xl border border-border/70 after:rounded-2xl sm:size-24">
            <AvatarImage
              src={user.image ?? undefined}
              alt={user.name}
              className="rounded-2xl"
            />
            <AvatarFallback className="rounded-2xl bg-primary/10 text-3xl font-bold text-primary">
              {user.name ? user.name.charAt(0).toUpperCase() : "U"}
            </AvatarFallback>
          </Avatar>
          <span
            className="absolute -bottom-1 -right-1 flex size-6 items-center justify-center rounded-full border-[3px] border-card bg-emerald-500 text-white"
            title="Active account"
          >
            <CheckCircle2Icon className="size-3.5" />
          </span>
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          <div className="space-y-1">
            <h1 className="break-words text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {user.name}
            </h1>
            <p className="break-all text-sm text-muted-foreground">{user.email}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge className="flex items-center gap-1.5 rounded-lg border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
              <ShieldCheckIcon className="size-3.5" />
              {user.role.replaceAll("_", " ")}
            </Badge>
            {departments.length > 0
              ? departments.map((department) => (
                  <Badge
                    key={department}
                    variant={department === user.department ? "outline" : "secondary"}
                    className="flex items-center gap-1.5 rounded-lg border-border px-2.5 py-1 text-xs font-medium"
                  >
                    {department === departments[0] && (
                      <Building2Icon className="size-3.5 text-muted-foreground" />
                    )}
                    {department.replaceAll("_", " ")}
                    {department === user.department ? " (Primary)" : ""}
                  </Badge>
                ))
              : (
                  <Badge
                    variant="outline"
                    className="flex items-center gap-1.5 rounded-lg border-border px-2.5 py-1 text-xs font-medium"
                  >
                    <Building2Icon className="size-3.5 text-muted-foreground" />
                    Unassigned
                  </Badge>
                )}
            <span className="flex items-center gap-1.5 px-1 text-xs text-muted-foreground">
              <CalendarIcon className="size-3.5" />
              Joined {formattedDate}
            </span>
            {showAttendanceAccess && (
              <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                <SparklesIcon className="size-3.5" />
                Attendance access active
              </span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
