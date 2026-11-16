import { createAuthClient } from "better-auth/react"
import { adminClient, inferAdditionalFields } from "better-auth/client/plugins"
import { organizationClient } from "better-auth/client/plugins";
import { ac, superAdminRole, userRole } from "@/lib/permissions";
import { GlobalRole } from "@/lib/global-role";
import { env } from "./env";
import type { auth } from "./auth";
import {
    organizationAc,
    organizationRoles,
} from "./organization-permissions";

export const { signIn, signUp, useSession, signOut, requestPasswordReset, resetPassword, sendVerificationEmail, updateUser, changePassword, admin, organization } = createAuthClient({
    /** The base URL of the server (optional if you're using the same domain) */
    baseURL: env.NEXT_PUBLIC_SITE_URL,
    plugins: [
        inferAdditionalFields<typeof auth>(),
        adminClient({
            ac,
            roles: {
                [GlobalRole.USER]: userRole,
                [GlobalRole.SUPER_ADMIN]: superAdminRole,
            }
        }),
        organizationClient({
            ac: organizationAc,
            roles: organizationRoles,
            dynamicAccessControl: {
                enabled: true,
            },
            teams: {
                enabled: true,
            },
        }),
    ]
})