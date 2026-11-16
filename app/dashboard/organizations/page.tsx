import { setActiveOrganization } from "@/actions/organization";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function OrganizationsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect("/signin");
  }

  const memberships = await prisma.member.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" },
    select: {
      role: true,
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  });

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-10 sm:px-8">
      <header className="max-w-2xl border-l-4 border-primary pl-5">
        <p className="text-sm font-medium text-muted-foreground">
          Your CRM workspaces
        </p>
        <h1 className="mt-2 font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
          Choose an organization
        </h1>
        <p className="mt-3 text-muted-foreground">
          Each organization has its own customers, projects, and people.
          Choose one to continue.
        </p>
      </header>

      {memberships.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Available organizations</CardTitle>
            <CardDescription>
              Your access is based on your role in each organization.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {memberships.map(({ organization, role }) => (
                <li
                  key={organization.id}
                  className="flex flex-col gap-4 py-5 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <h2 className="truncate font-medium">{organization.name}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {organization.slug} · {role}
                    </p>
                  </div>
                  <form action={setActiveOrganization}>
                    <input
                      type="hidden"
                      name="organizationId"
                      value={organization.id}
                    />
                    <Button type="submit" variant="outline">
                      Open workspace
                    </Button>
                  </form>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {memberships.length === 0 ? (
        <section className="rounded-xl border border-dashed p-8">
          <h2 className="font-heading text-lg font-medium">
            No organization access yet
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
            Ask your organization owner or a platform administrator to add you
            to a workspace.
          </p>
        </section>
      ) : null}
    </main>
  );
}
