import { PlatformShell } from "@/components/platform/platform-shell";
import { auth } from "@/lib/auth";
import { isPlatformSuperAdmin } from "@/lib/global-role";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

export default async function PlatformLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect("/signin?callbackUrl=%2Fplatform%2Forganizations");
  }
  if (!isPlatformSuperAdmin(session.user.role)) {
    redirect("/dashboard");
  }

  return (
    <PlatformShell
      user={{ name: session.user.name, email: session.user.email }}
    >
      {children}
    </PlatformShell>
  );
}
