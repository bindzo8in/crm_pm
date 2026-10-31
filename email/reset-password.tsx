import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";

type ResetPasswordEmailProps = {
  name?: string | null;
  appName: string;
  resetUrl: string;
  supportEmail?: string;
  isInvitation?: boolean;
};

export default function ResetPasswordEmail({
  name,
  appName,
  resetUrl,
  supportEmail,
  isInvitation = false,
}: ResetPasswordEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>
        {isInvitation
          ? `Your ${appName} account is ready`
          : `Reset your password for ${appName}`}
      </Preview>

      <Tailwind>
        <Body className="bg-zinc-100 py-10">
          <Container className="mx-auto max-w-xl rounded-xl bg-white p-8">
            <Heading className="m-0 text-3xl font-bold text-zinc-900">
              {isInvitation ? "Welcome to the team" : "Reset your password"}
            </Heading>

            <Text className="mt-6 text-base text-zinc-700">
              Hi {name ?? "there"},
            </Text>

            <Text className="text-base leading-7 text-zinc-700">
              {isInvitation
                ? `An account has been created for you on ${appName}. Set a password to verify your email and activate your account.`
                : `We received a request to reset the password for your account on ${appName}.`}
            </Text>

            <Text className="text-base leading-7 text-zinc-700">
              {isInvitation
                ? "Choose a password to get started."
                : "Click the button below to create a new password."}
            </Text>

            <Section className="my-8 text-center">
              <Button
                href={resetUrl}
                className="rounded-lg bg-black px-6 py-3 text-white"
              >
                {isInvitation ? "Set my password" : "Reset Password"}
              </Button>
            </Section>

            <Text className="text-sm text-zinc-600">
              If the button above does not work, copy and paste the following
              link into your browser:
            </Text>

            <Link
              href={resetUrl}
              className="break-all text-sm text-blue-600"
            >
              {resetUrl}
            </Link>

            <Text className="mt-6 text-sm text-zinc-600">
              {isInvitation
                ? "This setup link expires in 1 hour."
                : "This password reset link will expire in 1 hour."}
            </Text>

            <Text className="text-sm text-zinc-600">
              {isInvitation
                ? "If you were not expecting this invitation, you can safely ignore this email."
                : "If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged."}
            </Text>

            <Section className="mt-10 border-t border-zinc-200 pt-6">
              <Text className="m-0 text-xs text-zinc-500">
                © {new Date().getFullYear()} {appName}
              </Text>

              {supportEmail && (
                <Text className="mt-2 text-xs text-zinc-500">
                  Need help? Contact {supportEmail}
                </Text>
              )}
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}