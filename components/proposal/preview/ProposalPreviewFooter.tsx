"use client";

import type { ReactNode } from "react";
import { useSidebar } from "@/components/ui/sidebar";

export function ProposalPreviewFooter({ children }: { children: ReactNode }) {
  const { isMobile, state } = useSidebar();
  const left = isMobile
    ? "0px"
    : state === "expanded"
      ? "var(--sidebar-width)"
      : "calc(var(--sidebar-width-icon) + 2rem)";

  return (
    <footer
      className="fixed right-0 bottom-0 z-40 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-t bg-background/95 px-4 py-3 text-center shadow-[0_-4px_15px_-5px_rgba(0,0,0,0.1)] backdrop-blur-sm print:hidden"
      style={{ left }}
    >
      {children}
    </footer>
  );
}
