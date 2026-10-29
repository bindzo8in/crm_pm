import { notFound } from "next/navigation";
import { getProjectEditContext } from "@/actions/project";
import DashboardContainer from "@/app/dashboard/dashboard-container";
import { ProjectForm } from "@/components/projects/project-form";
import { requirePageAccess } from "@/lib/auth-guard";

type RouteParams = Promise<{ id: string }>;

export const metadata = { title: "Edit project" };

export default async function EditProjectPage({
  params,
}: {
  params: RouteParams;
}) {
  await requirePageAccess("/dashboard/projects");
  const { id } = await params;
  const context = await getProjectEditContext(id);
  if (!context.success) {
    return (
      <DashboardContainer title="Edit project" back={{ href: `/dashboard/projects/${id}`, label: "Back to project" }}>
        <section role="alert" className="mx-auto w-full max-w-3xl rounded-xl border border-destructive/30 bg-destructive/5 p-5">
          <h2 className="font-semibold">Project cannot be edited</h2>
          <p className="mt-2 text-sm text-muted-foreground">{context.message}</p>
        </section>
      </DashboardContainer>
    );
  }
  const data = context.data;
  if (!data) notFound();
  const { project } = data;

  return (
    <DashboardContainer title={`Edit ${project.projectCode}`} back={{ href: `/dashboard/projects/${id}`, label: "Back to project" }}>
      <ProjectForm
        customers={data.customers}
        initialUsers={data.users}
        initialData={{
          projectId: project.id,
          name: project.name,
          customerId: project.customerId,
          description: project.description,
          objectives: project.objectives,
          scope: project.scope,
          internalNotes: project.internalNotes,
          projectManagerId: project.projectManagerId,
          teamMemberIds: project.members.map(({ user }) => user.id),
          startDate: project.startDate?.toISOString().slice(0, 10) ?? "",
          dueDate: project.dueDate?.toISOString().slice(0, 10) ?? "",
          priority: project.priority,
          budgetAmount: project.budgetAmount ?? undefined,
          currency: project.currency === "USD" ? "USD" : "INR",
        }}
        customerLocked={Boolean(project.proposal)}
        canManageProjects={data.canManageProjects}
        canManageTeam={data.canManageTeam}
        canManageBudget={data.canManageBudget}
        currentUserId={data.currentUserId}
      />
    </DashboardContainer>
  );
}
