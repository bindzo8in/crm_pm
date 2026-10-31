"use client";

import { env } from "@/lib/env";
import Image from "next/image";

export function AttendanceBrand({ subtitle }: { subtitle: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
      <Image
          src="/logo.png"
          alt=""
          width={28}
          height={28}
          className="size-7 shrink-0 object-contain"
        />
      <div className="min-w-0">
        <p className="truncate text-sm font-extrabold tracking-tight sm:text-base">
          {env.NEXT_PUBLIC_APP_NAME}
        </p>
        <p className="truncate whitespace-nowrap text-[11px] font-medium text-muted-foreground sm:text-xs">
          {subtitle}
        </p>
      </div>
    </div>
  );
}
