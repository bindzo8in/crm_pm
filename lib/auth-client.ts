import { createAuthClient } from "better-auth/react"
import { adminClient } from "better-auth/client/plugins"
import { ac, adminRole, staffRole, superAdminRole } from "@/lib/permissions";
import { UserRole } from "@/app/generated/prisma/enums";
import { env } from "./env";

export const { signIn, signUp, useSession, signOut, requestPasswordReset, resetPassword, sendVerificationEmail, admin } = createAuthClient({
    /** The base URL of the server (optional if you're using the same domain) */
    baseURL: env.NEXT_PUBLIC_SITE_URL,
    plugins: [
        adminClient({
            ac,
            roles: {
                [UserRole.SUPER_ADMIN]: superAdminRole,
                [UserRole.ADMIN]: adminRole,
                [UserRole.STAFF]: staffRole,
            }
        })
    ]
})