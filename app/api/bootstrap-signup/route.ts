import { Pool } from "pg";
import { z } from "zod";
import { auth } from "@/lib/auth";
import {
  BOOTSTRAP_SIGNUP_HEADER,
  createBootstrapSignupSignature,
} from "@/lib/bootstrap-signup";
import { env } from "@/lib/env";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

const signupSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.email().max(254),
  password: z.string().min(8).max(128),
});

const globalForBootstrapPool = globalThis as typeof globalThis & {
  bootstrapSignupPool?: Pool;
};

const pool =
  globalForBootstrapPool.bootstrapSignupPool ??
  new Pool({ connectionString: env.DATABASE_URL, max: 3 });

if (process.env.NODE_ENV !== "production") {
  globalForBootstrapPool.bootstrapSignupPool = pool;
}

const LOCK_NAMESPACE = 932817;
const LOCK_KEY = 1;

export async function POST(request: Request) {
  const expectedOrigin = new URL(env.NEXT_PUBLIC_SITE_URL).origin;
  const requestOrigin = request.headers.get("origin");
  const contentType = request.headers
    .get("content-type")
    ?.split(";")[0]
    .trim()
    .toLowerCase();
  if (
    requestOrigin !== expectedOrigin ||
    contentType !== "application/json"
  ) {
    return Response.json({ error: "Request could not be verified." }, { status: 403 });
  }

  const input = signupSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) {
    return Response.json(
      { error: "Enter a valid name, email, and password." },
      { status: 400 },
    );
  }

  const client = await pool.connect();
  let lockAcquired = false;

  try {
    await client.query("SELECT pg_advisory_lock($1, $2)", [
      LOCK_NAMESPACE,
      LOCK_KEY,
    ]);
    lockAcquired = true;

    const existingUser = await prisma.user.findFirst({
      select: { id: true },
    });
    if (existingUser) {
      return Response.json(
        {
          error:
            "Initial administrator setup is already complete. Ask your administrator for an account.",
        },
        { status: 409 },
      );
    }

    const callbackURL = new URL("/onboarding", env.NEXT_PUBLIC_SITE_URL).toString();
    await auth.api.signUpEmail({
      body: {
        name: input.data.name,
        email: input.data.email,
        password: input.data.password,
        callbackURL,
      },
      headers: new Headers({
        [BOOTSTRAP_SIGNUP_HEADER]: createBootstrapSignupSignature(
          input.data.email,
          env.BETTER_AUTH_SECRET,
        ),
      }),
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error("Initial administrator signup failed:", error);
    return Response.json(
      { error: "We could not create the administrator account. Please try again." },
      { status: 500 },
    );
  } finally {
    try {
      if (lockAcquired) {
        await client.query("SELECT pg_advisory_unlock($1, $2)", [
          LOCK_NAMESPACE,
          LOCK_KEY,
        ]);
      }
    } finally {
      client.release();
    }
  }
}
