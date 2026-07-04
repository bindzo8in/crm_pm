import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { UserRole } from "@/app/generated/prisma/enums";
import { canAccessRoute } from "@/lib/route-permissions";

export async function proxy(request: NextRequest) {
    const session = await auth.api.getSession({
        headers: await headers()
    })

    if (!session) {
        const signInUrl = new URL("/signin", request.url);

        signInUrl.searchParams.set(
            "callbackUrl",
            request.nextUrl.pathname + request.nextUrl.search
        );
        return NextResponse.redirect(signInUrl);
    }

    const userRole = session.user.role as UserRole;
    const pathname = request.nextUrl.pathname;

    if (!canAccessRoute(pathname, userRole)) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/dashboard/:path*"],
};