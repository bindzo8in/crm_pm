import { SigninForm } from "@/components/auth/signin/signin-form";

export default async function SigninPage({ searchParams }: PageProps<'/signin'>) {
    const { callbackUrl } = await searchParams

    return (
        <SigninForm callbackUrl={callbackUrl as string} />
    )
}