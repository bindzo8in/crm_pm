export const metadata = {
  title: "Signup"
};

import { SignupForm } from "@/components/auth/signup/signup-form";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { connection } from "next/server";

export default async function SignupPage() {
    await connection();
    const existingUser = await prisma.user.findFirst({
        select: { id: true },
    });

    if (existingUser) {
        return (
            <section className="space-y-4 rounded-xl border bg-card p-6 text-center shadow-sm">
                <h1 className="text-2xl font-semibold tracking-tight">
                    Registration is closed
                </h1>
                <p className="text-sm text-muted-foreground">
                    The initial administrator has already been created. Ask your
                    administrator to invite you to Bindzo8 CRM.
                </p>
                <Button asChild className="w-full">
                    <Link href="/signin">Go to sign in</Link>
                </Button>
            </section>
        );
    }

    return (
        <SignupForm />
    )
}