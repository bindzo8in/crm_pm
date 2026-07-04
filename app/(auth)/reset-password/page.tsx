export const metadata = {
  title: "Reset Password"
};

import { ResetPasswordForm } from "@/components/auth/reset-password/reset-password";
import { redirect } from "next/navigation";

export default async function ResetPassword({ searchParams }: PageProps<'/reset-password'>) {
    const { token } = await searchParams;
    if (!token || typeof token !== "string" || token === "") {
        redirect("/")
    }
    return (
        <ResetPasswordForm token={token} />
    )
}