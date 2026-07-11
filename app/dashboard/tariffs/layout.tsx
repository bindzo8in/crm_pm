import { requirePageAccess } from "@/lib/auth-guard";

export default async function TariffsLayout({ children }: { children: React.ReactNode }) {
  await requirePageAccess("/dashboard/tariffs");
  return <>{children}</>;
}
