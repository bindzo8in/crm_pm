"use client";

import { useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";

function subscribe() {
  return () => {};
}

export function useHydratedPathname() {
  const pathname = usePathname();
  return useSyncExternalStore(subscribe, () => pathname, () => null);
}
