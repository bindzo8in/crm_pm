import { SalaryPinResetForm } from "@/components/salary/salary-pin-reset-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export const metadata = {
  title: "Reset salary PIN",
};

export default async function SalaryPinResetPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const { token } = await searchParams;
  if (!token || typeof token !== "string") {
    return (
      <Alert variant="destructive">
        <AlertCircle aria-hidden="true" className="size-4" />
        <AlertTitle>Reset link is invalid</AlertTitle>
        <AlertDescription>
          Request a new salary PIN reset link from Salary Management.
        </AlertDescription>
      </Alert>
    );
  }

  return <SalaryPinResetForm token={token} />;
}
