import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center bg-muted/20 px-4 py-8 sm:px-6">
      <div className="w-full max-w-lg space-y-4">{children}</div>
    </main>
  );
}
