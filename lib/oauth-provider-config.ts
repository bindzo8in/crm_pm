import { env } from "@/lib/env";

export const oauthProviderIds = [
  "google",
  "facebook",
  "twitter",
  "microsoft",
  "linkedin",
] as const;

export type OAuthProviderId = (typeof oauthProviderIds)[number];

type OAuthCredentials = {
  clientId: string;
  clientSecret: string;
};

function getOptionalCredentials(
  providerName: string,
  clientId: string | undefined,
  clientSecret: string | undefined,
): OAuthCredentials | undefined {
  if (Boolean(clientId) !== Boolean(clientSecret)) {
    throw new Error(
      `${providerName} OAuth requires both a client ID and client secret.`,
    );
  }

  if (!clientId || !clientSecret) return undefined;
  return { clientId, clientSecret };
}

export function getOAuthProviderConfigs() {
  const google = getOptionalCredentials(
    "Google",
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
  );
  if (!google) {
    throw new Error("Google OAuth requires a client ID and client secret.");
  }

  return {
    google,
    ...optionalProvider(
      "facebook",
      "Facebook",
      env.FACEBOOK_CLIENT_ID,
      env.FACEBOOK_CLIENT_SECRET,
    ),
    ...optionalProvider(
      "twitter",
      "X",
      env.TWITTER_CLIENT_ID,
      env.TWITTER_CLIENT_SECRET,
    ),
    ...optionalProvider(
      "microsoft",
      "Microsoft",
      env.MICROSOFT_CLIENT_ID,
      env.MICROSOFT_CLIENT_SECRET,
    ),
    ...optionalProvider(
      "linkedin",
      "LinkedIn",
      env.LINKEDIN_CLIENT_ID,
      env.LINKEDIN_CLIENT_SECRET,
    ),
  };
}

export function getConfiguredOAuthProviderIds(): OAuthProviderId[] {
  const configs = getOAuthProviderConfigs();
  return oauthProviderIds.filter((provider) => provider in configs);
}

function optionalProvider(
  providerId: Exclude<OAuthProviderId, "google">,
  providerName: string,
  clientId: string | undefined,
  clientSecret: string | undefined,
): Partial<Record<Exclude<OAuthProviderId, "google">, OAuthCredentials>> {
  const credentials = getOptionalCredentials(providerName, clientId, clientSecret);
  return credentials ? { [providerId]: credentials } : {};
}
