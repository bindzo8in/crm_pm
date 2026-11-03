import DashboardContainer from "@/app/dashboard/dashboard-container";
import { getProjectTaskWorkspace } from "@/actions/project";
import { TaskWorkspace } from "@/components/projects/task-workspace";
import { requirePageAccess } from "@/lib/auth-guard";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export const metadata = { title: "Tasks" };

export default async function TasksPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requirePageAccess("/dashboard/tasks");
  const params = await searchParams;
  const firstValue = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value;
  const list = (value: string | string[] | undefined) =>
    value === undefined ? [] : Array.isArray(value) ? value : [value];
  const filters = {
    view: firstValue(params.view),
    search: firstValue(params.search),
    status: list(params.status),
    priority: list(params.priority),
    cursor: firstValue(params.cursor),
  };
  const result = await getProjectTaskWorkspace(filters);

  if (!result.success || !result.data) {
    return (
      <DashboardContainer title="Tasks">
        <section
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive"
        >
          {result.message}
        </section>
      </DashboardContainer>
    );
  }

  return (
    <DashboardContainer title="Tasks">
      <TaskWorkspace
        data={result.data}
        view={filters.view === "assigned" ||
          filters.view === "created" ||
          filters.view === "upcoming" ||
          filters.view === "overdue" ||
          filters.view === "completed"
          ? filters.view
          : "all"}
        search={filters.search}
        status={filters.status}
        priority={filters.priority}
        nextCursor={result.data.nextCursor}
        projectOptions={result.data.creationProjects.items}
        hasMoreProjects={result.data.creationProjects.hasMore}
      />
    </DashboardContainer>
  );
}
