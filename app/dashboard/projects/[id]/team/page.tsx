import { getProjectTeamContext } from "@/actions/project";
import DashboardContainer from "@/app/dashboard/dashboard-container";
import { ProjectTeamManager } from "@/components/projects/project-team-manager";
import { requirePageAccess } from "@/lib/auth-guard";

type RouteParams = Promise<{ id: string }>;

export const metadata = { title: "Manage project team" };

export default async function ProjectTeamPage({
  params,
}: {
  params: RouteParams;
}) {
  await requirePageAccess("/dashboard/projects");
  const { id } = await params;
  const result = await getProjectTeamContext(id);
  if (!result.success || !result.data) {
    return (
      <DashboardContainer
        title="Manage project team"
        back={{ href: `/dashboard/projects/${id}`, label: "Back to project" }}
      >
        <section
          role="alert"
          className="mx-auto w-full max-w-3xl rounded-xl border border-destructive/30 bg-destructive/5 p-5"
        >
          <h2 className="font-semibold">Project team is unavailable</h2>
          <p className="mt-2 text-sm text-muted-foreground">{result.message}</p>
        </section>
      </DashboardContainer>
    );
  }

  const project = result.data;
  const initialMembers = project.members.map(({ user }) => user);

  return (
    <DashboardContainer
      title="Manage project team"
      back={{ href: `/dashboard/projects/${id}`, label: "Back to project" }}
    >
      <ProjectTeamManager
        projectId={project.id}
        projectCode={project.projectCode}
        projectName={project.name}
        initialManager={project.projectManager}
        initialMembers={initialMembers}
      />
    </DashboardContainer>
  );
}
