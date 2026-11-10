This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## First-run company setup

After the database schema is applied, open `/signup` and create the first
administrator account. Verify its email, then complete the required company
profile, shift schedule, and office geofence setup before using the CRM.
Public signup is disabled after the first account is created; administrators
can add staff from the CRM.

## OAuth sign-in

Google OAuth is required; Facebook, X, Microsoft, and LinkedIn are optional.
Configure each provider's client ID and client secret as server environment
variables. A provider appears on the sign-in page only when both values are
present. OAuth sign-up is disabled, so staff accounts must be created by an
administrator before they can sign in.

| Provider | Client ID | Client secret | Callback path |
| --- | --- | --- | --- |
| Google | `GOOGLE_CLIENT_ID` | `GOOGLE_CLIENT_SECRET` | `/api/auth/callback/google` |
| Facebook | `FACEBOOK_CLIENT_ID` | `FACEBOOK_CLIENT_SECRET` | `/api/auth/callback/facebook` |
| X | `TWITTER_CLIENT_ID` | `TWITTER_CLIENT_SECRET` | `/api/auth/callback/twitter` |
| Microsoft | `MICROSOFT_CLIENT_ID` | `MICROSOFT_CLIENT_SECRET` | `/api/auth/callback/microsoft` |
| LinkedIn | `LINKEDIN_CLIENT_ID` | `LINKEDIN_CLIENT_SECRET` | `/api/auth/callback/linkedin` |

Register the full callback URL with each provider, using
`http://localhost:3000` for local development and the deployed `BETTER_AUTH_URL`
origin in production. Keep all client secrets server-side and out of source
control.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
