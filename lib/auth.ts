import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import prisma from "./prisma";
import { nextCookies } from "better-auth/next-js";
import { admin } from "better-auth/plugins/admin"
import { sendResetPasswordEmail, sendVerificationEmail } from "./email";
import { env } from "./env";
import { UserRole } from "@/app/generated/prisma/enums";
import { ac, adminRole, staffRole, superAdminRole } from './permissions'

export const auth = betterAuth({
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    database: prismaAdapter(prisma, {
        provider: "postgresql"
    }),
    emailAndPassword: {
        enabled: true,
        autoSignIn: false,
        requireEmailVerification: true,
        resetPasswordTokenExpiresIn: 60 * 60, // 1 hour
        sendResetPassword: async ({ url, user }) => {
            sendResetPasswordEmail({
                email: user.email,
                appName: env.NEXT_PUBLIC_APP_NAME,
                resetUrl: url,
                supportEmail: env.NEXT_PUBLIC_SUPPORT_EMAIL,
            })
        },
        revokeSessionsOnPasswordReset: true
    },
    emailVerification: {
        sendOnSignUp: true,
        sendOnSignIn: true,
        expiresIn: 24 * 60 * 60, // 24 hours
        sendVerificationEmail: async ({ token, url, user }) => {
            sendVerificationEmail({
                email: user.email,
                appName: env.NEXT_PUBLIC_APP_NAME,
                verificationUrl: url,
                supportEmail: env.NEXT_PUBLIC_SUPPORT_EMAIL,
                name: user.name,
            })
        },
        autoSignInAfterVerification: true,
    },
    socialProviders: {
        google: {
            clientId: env.GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET,
            accessType: "offline"
        }
    },
    plugins: [
        admin({
            ac,
            defaultRole: UserRole.STAFF,
            roles: {
                [UserRole.SUPER_ADMIN]: superAdminRole,
                [UserRole.ADMIN]: adminRole,
                [UserRole.STAFF]: staffRole,
            }

        })
        , nextCookies()// make sure this is the last plugin in the array
    ]
});