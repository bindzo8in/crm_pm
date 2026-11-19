"use client";

import type { ReactNode } from "react";
import { useSidebar } from "@/components/ui/sidebar";

interface ProposalWorkflowActionBarProps {
  children: ReactNode;
}

export function ProposalWorkflowActionBar({ children }: ProposalWorkflowActionBarProps) {
  const { isMobile, state } = useSidebar();

  const left = isMobile
    ? "0px"
    : state === "expanded"
      ? "var(--sidebar-width)"
      : "calc(var(--sidebar-width-icon) + 2rem)";

  return (
    <div
      role="region"
      aria-label="Proposal step action"
      className="fixed right-0 z-40 border-t bg-background/95 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur supports-[backdrop-filter]:bg-background/85 md:right-2 max-md:left-0! max-md:bottom-[calc(3.75rem+env(safe-area-inset-bottom))]!"
      style={{
        left,
        bottom: isMobile ? "calc(3.75rem + env(safe-area-inset-bottom))" : 0,
      }}
    >
      <div className="mx-auto flex max-w-[1760px] justify-end px-3 py-3 sm:px-5 lg:px-6">
        {children}
      </div>
    </div>
  );
}
