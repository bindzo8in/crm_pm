"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Tabs } from "@/components/ui/tabs";

export function LeaveViewTabs({
  defaultValue,
  scrollOnMount = false,
  children,
}: {
  defaultValue: string;
  scrollOnMount?: boolean;
  children: ReactNode;
}) {
  const [value, setValue] = useState(defaultValue);
  const hasMounted = useRef(false);

  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      if (!scrollOnMount) return;
    }

    const targetId = value === "my-leave" ? "my-leave-results" : "team-leave-results";
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(targetId)?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
        block: "start",
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [scrollOnMount, value]);

  return (
    <Tabs
      value={value}
      onValueChange={setValue}
      className="w-full"
    >
      {children}
    </Tabs>
  );
}
