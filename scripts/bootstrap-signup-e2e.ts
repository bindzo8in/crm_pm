import { randomUUID } from "node:crypto";
import { config } from "dotenv";

config({ path: ".env", override: true, quiet: true });
config({ path: ".env.test", override: true, quiet: true });

function assertDisposableTestDatabase(): void {
  for (const key of ["DATABASE_URL", "DIRECT_URL"]) {
    const value = process.env[key];
    if (!value) {
      throw new Error(`${key} must point to local crm_attendance_e2e.`);
    }

    const database = new URL(value);
    if (
      !["localhost", "127.0.0.1", "::1"].includes(database.hostname) ||
      database.pathname.replace(/^\/+/, "") !== "crm_attendance_e2e"
    ) {
      throw new Error(
        `Refusing to run bootstrap E2E setup: ${key} must point to local crm_attendance_e2e.`,
      );
    }
  }
}

async function main(): Promise<void> {
  assertDisposableTestDatabase();
  const mode = process.argv[2] ?? "seed";
  if (mode !== "seed" && mode !== "verify") {
    throw new Error("Usage: tsx scripts/bootstrap-signup-e2e.ts [seed|verify]");
  }

  const [{ default: prisma }, { UserRole }] = await Promise.all([
    import("../lib/prisma"),
    import("../app/generated/prisma/enums"),
  ]);

  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true },
    });

    if (mode === "seed") {
      if (users.length !== 0) {
        throw new Error(
          "The test database must be reset and have no users before seeding.",
        );
      }

      await prisma.user.create({
        data: {
          id: `bootstrap-e2e-${randomUUID()}`,
          name: "Playwright Bootstrap Admin",
          email: `bootstrap-e2e-${randomUUID()}@example.invalid`,
          role: UserRole.SUPER_ADMIN,
        },
      });
    } else if (
      users.length !== 1 ||
      users[0].role !== UserRole.SUPER_ADMIN ||
      users[0].name !== "Playwright Bootstrap Admin" ||
      !users[0].email.endsWith("@example.invalid")
    ) {
      throw new Error(
        "Expected exactly one synthetic SUPER_ADMIN and no additional users.",
      );
    }

    const totalUsers = await prisma.user.count();
    console.log(
      `${mode === "seed" ? "Seeded" : "Verified"} ${totalUsers} user(s); initial role: SUPER_ADMIN.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
