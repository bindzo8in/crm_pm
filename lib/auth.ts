import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { prismaAdapter } from "better-auth/adapters/prisma";
import prisma from "./prisma";
import { nextCookies } from "better-auth/next-js";
import { admin } from "better-auth/plugins/admin"
import { sendExistingUserSignupEmail, sendResetPasswordEmail, sendVerificationEmail } from "./email";
import { env } from "./env";
import { EmploymentStatus, UserRole, WorkMode } from "@/app/generated/prisma/enums";
import { ac, adminRole, staffRole, superAdminRole } from './permissions'
import { expo } from "@better-auth/expo";
import {
    BOOTSTRAP_SIGNUP_HEADER,
    isValidBootstrapSignupSignature,
} from "./bootstrap-signup";
import { getOAuthProviderConfigs } from "./oauth-provider-config";

const canLog = process.env.NODE_ENV === "development"
const oauthProviderConfigs = getOAuthProviderConfigs();
export const auth = betterAuth({
    baseURL: env.BETTER_AUTH_URL,
    logger: {
        disable: !canLog,
        disableColors: !canLog,
        level: "debug",
        log: (level, message, ...args) => {
            // Custom logging implementation
            console.log(`[${level}] ${message}`, ...args);
        }
    },
    trustedOrigins: [
        env.NEXT_PUBLIC_SITE_URL,
        env.NEXT_PUBLIC_APP_SCHEME,

        // Development mode - Expo's exp:// scheme with local IP ranges
        ...(process.env.NODE_ENV === "development" ? [
            "exp://",                      // Trust all Expo URLs (prefix matching)
            "exp://**",                    // Trust all Expo URLs (wildcard matching)
            "exp://192.168.*.*:*/**"       // Trust 192.168.x.x IP range with any port and path
        ] : [])
    ],
    secret: env.BETTER_AUTH_SECRET,
    database: prismaAdapter(prisma, {
        provider: "postgresql"
    }),
    hooks: {
        before: createAuthMiddleware(async (ctx) => {
            if (ctx.path !== "/sign-up/email") return;

            const email =
                typeof ctx.body.email === "string" ? ctx.body.email : "";
            const signature =
                ctx.headers?.get(BOOTSTRAP_SIGNUP_HEADER) ?? null;
            if (
                !isValidBootstrapSignupSignature(
                    signature,
                    email,
                    env.BETTER_AUTH_SECRET,
                )
            ) {
                throw new APIError("FORBIDDEN", {
                    message: "Public account registration is disabled.",
                });
            }
        }),
    },
    databaseHooks: {
        user: {
            create: {
                before: async (user, context) => {
                    const isBootstrapSignup =
                        context?.path === "/sign-up/email" &&
                        isValidBootstrapSignupSignature(
                            context.headers?.get(BOOTSTRAP_SIGNUP_HEADER) ?? null,
                            user.email,
                            env.BETTER_AUTH_SECRET,
                        );

                    return {
                        data: {
                            ...user,
                            role: isBootstrapSignup
                                ? UserRole.SUPER_ADMIN
                                : UserRole.STAFF,
                        },
                    };
                },
            },
        },
        session: {
            create: {
                before: async (session) => {
                    const user = await prisma.user.findUnique({
                        where: { id: session.userId },
                        select: { employmentStatus: true },
                    });
                    if (user?.employmentStatus === EmploymentStatus.INACTIVE) {
                        throw new Error("This employee account is inactive.");
                    }
                },
                after: async (session) => {
                    const user = await prisma.user.findUnique({
                        where: { id: session.userId },
                        select: { employmentStatus: true },
                    });
                    if (!user || user.employmentStatus !== EmploymentStatus.ACTIVE) {
                        await prisma.session.deleteMany({
                            where: { token: session.token },
                        });
                        throw new Error("This employee account is inactive.");
                    }
                },
            },
        },
    },
    user: {
        additionalFields: {
            department: {
                type: "string",
                required: false,
                input: false,
            },
            workMode: {
                type: "string",
                required: false,
                defaultValue: WorkMode.OFFICE.toString()
            }
        },
    },
    session: {
        expiresIn: 60 * 60 * 24 * 30, // 30 days
        updateAge: 60 * 60 * 24, // 1 day,
        additionalFields: {
            department: {
                type: "string",
                required: false,
            },
        }
    },
    emailAndPassword: {
        enabled: true,
        autoSignIn: false,
        requireEmailVerification: true,
        resetPasswordTokenExpiresIn: 60 * 60, // 1 hour
        sendResetPassword: async ({ url, user }) => {
            await sendResetPasswordEmail({
                name: user.name,
                email: user.email,
                appName: env.NEXT_PUBLIC_APP_NAME,
                resetUrl: url,
                supportEmail: env.NEXT_PUBLIC_SUPPORT_EMAIL,
            })
        },
        revokeSessionsOnPasswordReset: true,
        onPasswordReset: async ({ user }) => {
            // Completing the email-delivered reset link proves mailbox access.
            await prisma.user.update({
                where: { id: user.id },
                data: { emailVerified: true },
            });
        },
        onExistingUserSignUp: async ({ user }) => {
            void sendExistingUserSignupEmail({
                email: user.email,
                appName: env.NEXT_PUBLIC_APP_NAME,
                name: user.name,
                supportEmail: env.NEXT_PUBLIC_SUPPORT_EMAIL,
            });
        },
    },
    emailVerification: {
        sendOnSignUp: true,
        sendOnSignIn: true,
        expiresIn: 24 * 60 * 60, // 24 hours
        sendVerificationEmail: async ({ url, user }) => {
            await sendVerificationEmail({
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
            ...oauthProviderConfigs.google,
            accessType: "offline",
            disableSignUp: true,
        },
        ...(oauthProviderConfigs.facebook && {
            facebook: {
                ...oauthProviderConfigs.facebook,
                disableSignUp: true,
            },
        }),
        ...(oauthProviderConfigs.twitter && {
            twitter: {
                ...oauthProviderConfigs.twitter,
                disableSignUp: true,
            },
        }),
        ...(oauthProviderConfigs.microsoft && {
            microsoft: {
                ...oauthProviderConfigs.microsoft,
                disableSignUp: true,
            },
        }),
        ...(oauthProviderConfigs.linkedin && {
            linkedin: {
                ...oauthProviderConfigs.linkedin,
                disableSignUp: true,
            },
        }),
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

        }),
        expo(),
        nextCookies()// make sure this is the last plugin in the array
    ]
});