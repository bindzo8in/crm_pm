export const metadata = {
  title: "Forget Password"
};

import { ForgotPasswordForm } from "@/components/auth/forgot-password/forgot-password";

export default async function ResetPassword(){
    return (
        <ForgotPasswordForm />
    )
}