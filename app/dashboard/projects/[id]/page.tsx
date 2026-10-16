import Link from "next/link";
import { notFound } from "next/navigation";
import { getProject } from "@/actions/project";
import DashboardContainer from "@/app/dashboard/dashboard-container";
import { ProjectWorkspace } from "@/components/projects/project-workspace";
import { Button } from "@/components/ui/button";
import { requirePageAccess } from "@/lib/auth-guard";

type RouteParams = Promise<{ id: string }>;

export default async function ProjectDetailsPage({
  params,
}: {
  params: RouteParams;
}) {
  await requirePageAccess("/dashboard/projects");
  const { id } = await params;
  const result = await getProject(id);
  if (!result.success) {
    return (
      <DashboardContainer title="Project details">
        <section role="alert" className="mx-auto w-full max-w-3xl rounded-xl border border-destructive/30 bg-destructive/5 p-5">
          <h2 className="font-semibold">Project details are unavailable</h2>
          <p className="mt-2 text-sm text-muted-foreground">{result.message}</p>
          <Button asChild variant="outline" className="mt-4">
            <Link href="/dashboard/projects">Back to projects</Link>
          </Button>
        </section>
      </DashboardContainer>
    );
  }
  if (!result.data) notFound();

  return (
    <DashboardContainer title={result.data.project.projectCode}>
      <ProjectWorkspace data={result.data} />
    </DashboardContainer>
  );
}
