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

type VerificationEmailProps = {
    name?: string;
    appName: string;
    verificationUrl: string;
    supportEmail?: string;
};

export default function VerificationEmail({
    name = "there",
    appName,
    verificationUrl,
    supportEmail,
}: VerificationEmailProps) {
    return (<Html> <Head />
        <Tailwind>
     <Preview>Verify your email address for {appName}</Preview>
            <Body className="bg-gray-100 py-10">
                <Container className="mx-auto max-w-xl rounded-xl bg-white p-8">
                    <Section>
                        <Heading className="m-0 text-3xl font-bold text-gray-900">
                            Welcome to {appName}
                        </Heading>

                        <Text className="mt-6 text-base text-gray-700">
                            Hi {name},
                        </Text>

                        <Text className="text-base leading-7 text-gray-700">
                            Thank you for creating an account. Please verify your email
                            address to activate your account and continue using {appName}.
                        </Text>

                        <Section className="my-8 text-center">
                            <Button
                                href={verificationUrl}
                                className="rounded-lg bg-black px-6 py-3 text-white"
                            >
                                Verify Email
                            </Button>
                        </Section>

                        <Text className="text-sm text-gray-600">
                            If the button above does not work, copy and paste the following
                            link into your browser:
                        </Text>

                        <Link
                            href={verificationUrl}
                            className="break-all text-sm text-blue-600"
                        >
                            {verificationUrl}
                        </Link>

                        <Text className="mt-6 text-sm text-gray-600">
                            This verification link will expire in 24 hours.
                        </Text>

                        <Text className="text-sm text-gray-600">
                            If you did not create an account, you can safely ignore this
                            email.
                        </Text>

                        <Section className="mt-10 border-t border-gray-200 pt-6">
                            <Text className="m-0 text-xs text-gray-500">
                                © {new Date().getFullYear()} {appName}
                            </Text>

                            {supportEmail && (
                                <Text className="mt-2 text-xs text-gray-500">
                                    Need help? Contact {supportEmail}
                                </Text>
                            )}
                        </Section>
                    </Section>
                </Container>
            </Body>
        </Tailwind>
    </Html>

    );
}
