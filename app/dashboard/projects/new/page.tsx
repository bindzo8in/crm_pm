import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getProjectCreationContext } from "@/actions/project";
import DashboardContainer from "@/app/dashboard/dashboard-container";
import { ProjectForm } from "@/components/projects/project-form";
import { Button } from "@/components/ui/button";
import { requirePageAccess } from "@/lib/auth-guard";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export const metadata = { title: "Create project" };

export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requirePageAccess("/dashboard/projects");
  const params = await searchParams;
  const firstValue = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value;
  const context = await getProjectCreationContext({
    customerId: firstValue(params.customerId),
    proposalId: firstValue(params.proposalId),
  });

  if (!context.success) {
    return (
      <DashboardContainer title="Create project">
        <section role="alert" className="mx-auto w-full max-w-3xl rounded-xl border border-destructive/30 bg-destructive/5 p-5">
          <h2 className="font-semibold">Project form is unavailable</h2>
          <p className="mt-2 text-sm text-muted-foreground">{context.message}</p>
          <Button asChild variant="outline" className="mt-4">
            <Link href="/dashboard/projects">Back to projects</Link>
          </Button>
        </section>
      </DashboardContainer>
    );
  }
  const data = context.data;
  if (!data) notFound();
  if (data.existingProject) {
    redirect(`/dashboard/projects/${data.existingProject.id}`);
  }

  return (
    <DashboardContainer title={data.proposal ? "Convert proposal to project" : "Create project"}>
      <ProjectForm
        customers={data.customers}
        initialUsers={data.users}
        customerLocked={Boolean(data.proposal || data.customer)}
        proposal={data.proposal}
        canManageProjects={data.canManageProjects}
        canManageTeam={data.canManageTeam}
        canManageBudget={data.canManageBudget}
        currentUserId={data.currentUserId}
      />
    </DashboardContainer>
  );
}
