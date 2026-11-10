export const metadata = {
  title: "Signin"
};

import { SigninForm } from "@/components/auth/signin/signin-form";
import { getConfiguredOAuthProviderIds } from "@/lib/oauth-provider-config";

export default async function SigninPage({ searchParams }: PageProps<'/signin'>) {
    const { callbackUrl } = await searchParams

    return (
        <SigninForm
            callbackUrl={typeof callbackUrl === "string" ? callbackUrl : "/"}
            enabledProviders={getConfiguredOAuthProviderIds()}
        />
    )
}