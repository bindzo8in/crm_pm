import Link from "next/link";
import { FolderKanban } from "lucide-react";
import { notFound } from "next/navigation";
import { GetCustomer } from "@/actions/customer";
import { getProjects } from "@/actions/project";
import DashboardContainer from "@/app/dashboard/dashboard-container";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requirePageAccess } from "@/lib/auth-guard";

type RouteParams = Promise<{ id: string }>;

export default async function CustomerDetailsPage({
  params,
}: {
  params: RouteParams;
}) {
  await requirePageAccess("/dashboard/customers");
  const { id } = await params;
  const [customerResult, projectResult] = await Promise.all([
    GetCustomer(id),
    getProjects({ customerId: id, pageSize: 10 }),
  ]);
  if (!customerResult.success || !customerResult.customer || customerResult.customer.deletedAt) notFound();
  const customer = customerResult.customer;

  return (
    <DashboardContainer
      title={customer.displayName}
      back={{ href: "/dashboard/customers", label: "Back to customers" }}
      action={projectResult.success && projectResult.data?.canCreateProjects
        ? {
            href: `/dashboard/projects/new?customerId=${encodeURIComponent(customer.id)}`,
            label: "Create project",
            icon: <FolderKanban />,
          }
        : undefined}
    >
      <section className="rounded-xl border bg-card p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">Customer #{customer.customerNumber}</Badge>
              <Badge variant="secondary">{customer.customerType.toLowerCase()}</Badge>
            </div>
            <h2 className="mt-3 text-2xl font-semibold">{customer.displayName}</h2>
            {customer.companyName && <p className="mt-1 text-muted-foreground">{customer.companyName}</p>}
          </div>
          <Button asChild variant="outline">
            <Link href={`/dashboard/customers/${customer.id}/edit`}>Edit customer</Link>
          </Button>
        </div>

        <dl className="mt-6 grid gap-x-6 gap-y-4 border-t pt-5 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["Primary contact", customer.primaryContactName],
            ["Email", customer.primaryContactEmail],
            ["Phone", customer.primaryContactPhone],
            ["Website", customer.website],
            ["Location", [customer.city, customer.state, customer.country].filter(Boolean).join(", ")],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-sm text-muted-foreground">{label}</dt>
              <dd className="mt-1 break-words text-sm font-medium">{value || "Not provided"}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="rounded-xl border bg-card p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Projects</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Work linked to this customer.
            </p>
          </div>
        </div>
        {!projectResult.success ? (
          <p role="alert" className="mt-5 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {projectResult.message}
          </p>
        ) : projectResult.data?.items.length ? (
          <div className="mt-5 divide-y rounded-lg border">
            {projectResult.data.items.map((project) => (
              <Link
                key={project.id}
                href={`/dashboard/projects/${project.id}`}
                className="flex flex-col gap-2 p-4 outline-none hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium">{project.name}</p>
                  <p className="mt-1 font-mono text-xs text-muted-foreground">{project.projectCode}</p>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Badge variant="outline">{project.status.replaceAll("_", " ").toLowerCase()}</Badge>
                  <span className="text-muted-foreground">
                    {project.dueDate
                      ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(project.dueDate))
                      : "No target date"}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="mt-5 rounded-lg border border-dashed px-4 py-8 text-center">
            <p className="font-medium">No projects linked to this customer</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Create a project here or convert an accepted proposal.
            </p>
          </div>
        )}
      </section>
    </DashboardContainer>
  );
}
