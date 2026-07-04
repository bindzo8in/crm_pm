export const metadata = {
  title: "Signup"
};

import { SignupForm } from "@/components/auth/signup/signup-form";

export default async function SignupPage() {
    return (
        <SignupForm />
    )
}