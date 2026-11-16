import { CreateOrganizationForm } from "@/components/organization/create-organization-form";
import { Card, CardContent } from "@/components/ui/card";
import prisma from "@/lib/prisma";
import Link from "next/link";

export default async function PlatformOrganizationsPage() {
  const organizations = await prisma.organization.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      slug: true,
      createdAt: true,
      members: {
        where: { role: "owner" },
        select: {
          user: {
            select: { name: true, email: true, role: true },
          },
        },
      },
      invitations: {
        where: { role: "owner", status: "pending" },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { email: true },
      },
    },
  });

  return (
    <main className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-8 sm:px-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(20rem,0.65fr)] lg:py-12">
      <section className="space-y-6">
        <header className="max-w-2xl">
          <p className="text-sm font-medium text-primary">
            Platform administration
          </p>
          <h1 className="mt-2 font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
            Organizations
          </h1>
          <p className="mt-3 text-muted-foreground">
            Create workspaces and invite each organization&apos;s owner to
            complete setup. Platform administration stays separate from tenant
            workspaces.
          </p>
        </header>

        {organizations.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-10 text-center">
              <p className="font-medium">No organizations yet</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Create the first workspace, then invite its owner.
              </p>
            </CardContent>
          </Card>
        ) : (
          <ul className="space-y-3">
            {organizations.map((organization) => {
              const pendingInvitation = organization.invitations[0];
              const activeOwner = organization.members.find(
                (member) => member.user.role !== "SUPER_ADMIN",
              );
              const ownerStatus = activeOwner
                ? `Owner: ${activeOwner.user.name}`
                : pendingInvitation
                  ? `Invitation pending: ${pendingInvitation.email}`
                  : "Owner invitation needed";

              return (
                <li key={organization.id}>
                  <Link
                    href={`/platform/organizations/${organization.id}`}
                    className="block rounded-xl border bg-card p-5 transition-colors hover:border-primary/40 hover:bg-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <h2 className="truncate font-heading text-lg font-semibold">
                          {organization.name}
                        </h2>
                        <p className="mt-1 truncate text-sm text-muted-foreground">
                          {organization.slug}
                        </p>
                      </div>
                      <span className="w-fit rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                        {ownerStatus}
                      </span>
                    </div>
                    <p className="mt-4 text-xs text-muted-foreground">
                      Created {organization.createdAt.toLocaleDateString()}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <aside className="lg:pt-1">
        <CreateOrganizationForm />
      </aside>
    </main>
  );
}
