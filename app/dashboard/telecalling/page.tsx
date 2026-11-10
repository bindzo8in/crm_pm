import type { Metadata } from "next";
import { requirePageAccess } from "@/lib/auth-guard";
import { TelecallingPrototype } from "@/components/telecalling/telecalling-prototype";

export const metadata: Metadata = {
  title: "Telecalling workspace",
};

export default async function TelecallingPage() {
  await requirePageAccess("/dashboard/customers");

  return <TelecallingPrototype />;
}
