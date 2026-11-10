import Link from "next/link";
import {
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  CircleDot,
  Flag,
  FolderKanban,
  LayoutGrid,
  List,
  ListTodo,
  Plus,
  Search,
  UserRound,
  UsersRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import DashboardContainer from "@/app/dashboard/dashboard-container";
import { getProjects } from "@/actions/project";
import { projectQuerySchema } from "@/lib/schemas/project-schema";
import { requirePageAccess } from "@/lib/auth-guard";
import { notFound } from "next/navigation";
import {
  MultiSelect,
  type MultiSelectOption,
} from "@/components/ui/multi-select";
import { OptionSelect } from "@/components/ui/option-select";

export const metadata = { title: "Projects" };

const statusLabels: Record<string, string> = {
  PLANNING: "Planning",
  NOT_STARTED: "Not started",
  IN_PROGRESS: "In progress",
  ON_HOLD: "On hold",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

const statusVariants: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  PLANNING: "outline",
  NOT_STARTED: "secondary",
  IN_PROGRESS: "default",
  ON_HOLD: "outline",
  COMPLETED: "secondary",
  CANCELLED: "destructive",
};

const projectStatusOptions: MultiSelectOption[] = [
  { value: "PLANNING", label: "Planning", icon: "planning" },
  { value: "NOT_STARTED", label: "Not started", icon: "notStarted" },
  { value: "IN_PROGRESS", label: "In progress", icon: "inProgress" },
  { value: "ON_HOLD", label: "On hold", icon: "onHold" },
  { value: "COMPLETED", label: "Completed", icon: "completed" },
  { value: "CANCELLED", label: "Cancelled", icon: "cancelled" },
];

const projectPriorityOptions: MultiSelectOption[] = [
  { value: "LOW", label: "Low", icon: "flag" },
  { value: "MEDIUM", label: "Medium", icon: "flag" },
  { value: "HIGH", label: "High", icon: "flag" },
  { value: "URGENT", label: "Urgent", icon: "overdue" },
];

function formatDate(value: Date | string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(new Date(value));
}

function pageUrl(
  searchParams: Record<string, string | string[] | undefined>,
  cursor: number,
  direction: "next" | "previous",
) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (Array.isArray(value)) {
      value.forEach((item) => params.append(key, item));
    } else if (value) {
      params.set(key, value);
    }
  }
  params.set("cursor", String(cursor));
  params.set("direction", direction);
  return `/dashboard/projects?${params.toString()}`;
}

type ProjectsSearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: ProjectsSearchParams;
}) {
  await requirePageAccess("/dashboard/projects");
  const params = await searchParams;
  const scalar = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value;
  const list = (value: string | string[] | undefined) =>
    value === undefined ? [] : Array.isArray(value) ? value : [value];
  const rawFilters = {
    search: scalar(params.search),
    status: list(params.status),
    priority: list(params.priority),
    customerId: scalar(params.customerId),
    projectManagerId: list(params.projectManagerId),
    memberId: list(params.memberId),
    overdue: scalar(params.overdue),
    dueFrom: scalar(params.dueFrom),
    dueTo: scalar(params.dueTo),
    cursor: scalar(params.cursor),
    direction: scalar(params.direction),
    sortDirection: scalar(params.sortDirection),
    view: scalar(params.view),
    pageSize: scalar(params.pageSize),
  };
  const validQuery = projectQuerySchema.safeParse(rawFilters);
  if (!validQuery.success) notFound();

  const result = await getProjects(validQuery.data);
  if (!result.success || !result.data) {
    return (
      <DashboardContainer title="Projects">
        <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive">
          {result.message}
        </div>
      </DashboardContainer>
    );
  }
  const { items, summary, canGoNext, canGoPrevious, nextCursor, previousCursor } = result.data;
  const preserve = Object.fromEntries(
    Object.entries(rawFilters).filter(([key, value]) =>
      key !== "cursor" &&
      key !== "direction" &&
      (Array.isArray(value) ? value.length > 0 : Boolean(value)),
    ),
  ) as Record<string, string | string[] | undefined>;
  const projectManagerOptions: MultiSelectOption[] = [
    { value: "unassigned", label: "No project manager", icon: "manager" },
    ...result.data.filters.projectManagers.map((manager) => ({
      value: manager.id,
      label: manager.name,
      icon: "manager" as const,
    })),
  ];
  const teamMemberOptions: MultiSelectOption[] = result.data.filters.teamMembers.map((member) => ({
    value: member.id,
    label: member.name,
    icon: "team",
  }));

  return (
    <DashboardContainer
      title="Projects"
      action={result.data.canCreateProjects
        ? { href: "/dashboard/projects/new", label: "Create project", icon: <Plus /> }
        : undefined}
    >
      <p className="-mt-2 text-sm text-muted-foreground">
        Track delivery, owners, and deadlines across your customer work.
      </p>

      <section aria-label="Project summary" className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 xl:grid-cols-5">
        {[
          { label: "All projects", value: summary.total, icon: FolderKanban },
          { label: "Active", value: summary.active, icon: CircleDot },
          { label: "On hold", value: summary.onHold, icon: CircleAlert },
          { label: "Completed", value: summary.completed, icon: CheckCircle2 },
          { label: "Overdue", value: summary.overdue, icon: CalendarDays },
        ].map(({ label, value, icon: SummaryIcon }) => (
          <article key={label} className="flex min-w-0 items-center justify-between gap-2 rounded-lg border bg-card px-3 py-2.5 sm:px-4">
            <p className="flex min-w-0 items-center gap-2 truncate text-xs text-muted-foreground sm:text-sm">
              <SummaryIcon aria-hidden="true" className="size-4 shrink-0" />
              <span className="truncate">{label}</span>
            </p>
            <p className="shrink-0 text-lg font-semibold tabular-nums sm:text-xl">{value}</p>
          </article>
        ))}
      </section>

      <form method="GET" className="grid grid-cols-2 gap-2 rounded-lg border bg-card p-3 sm:gap-3 sm:p-4 lg:grid-cols-4">
        <input type="hidden" name="view" value={rawFilters.view === "list" ? "list" : "grid"} />
        <div className="relative col-span-2 min-w-0 lg:col-span-1">
          <Search aria-hidden="true" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            name="search"
            defaultValue={rawFilters.search}
            aria-label="Search projects"
            className="h-10 w-full min-w-0 rounded-md border border-input bg-background pl-9 pr-3 text-sm"
            placeholder="Search projects, code, customer"
          />
        </div>
        <MultiSelect
          key={`status-${rawFilters.status.join(",")}`}
          name="status"
          label="Filter by status"
          options={projectStatusOptions}
          defaultValue={rawFilters.status}
          placeholder="All statuses"
          searchPlaceholder="Search statuses"
        />
        <MultiSelect
          key={`priority-${rawFilters.priority.join(",")}`}
          name="priority"
          label="Filter by priority"
          options={projectPriorityOptions}
          defaultValue={rawFilters.priority}
          placeholder="All priorities"
          searchPlaceholder="Search priorities"
        />
        <MultiSelect
          key={`manager-${rawFilters.projectManagerId.join(",")}`}
          name="projectManagerId"
          label="Filter by project manager"
          options={projectManagerOptions}
          defaultValue={rawFilters.projectManagerId}
          placeholder="All project managers"
          searchPlaceholder="Search managers"
        />
        <MultiSelect
          key={`member-${rawFilters.memberId.join(",")}`}
          name="memberId"
          label="Filter by team member"
          options={teamMemberOptions}
          defaultValue={rawFilters.memberId}
          placeholder="All team members"
          searchPlaceholder="Search team members"
        />
        <OptionSelect
          name="overdue"
          label="Filter overdue projects"
          defaultValue={rawFilters.overdue ?? ""}
          emptyLabel="Any deadline"
          options={[
            { value: "true", label: "Overdue only", icon: "overdue" },
            { value: "false", label: "Exclude overdue", icon: "calendar" },
          ]}
        />
        <OptionSelect
          name="sortDirection"
          label="Sort projects"
          defaultValue={rawFilters.sortDirection === "asc" ? "asc" : "desc"}
          options={[
            { value: "desc", label: "Newest first", icon: "calendar" },
            { value: "asc", label: "Oldest first", icon: "calendar" },
          ]}
        />
        <label className="grid gap-1 text-xs text-muted-foreground">
          Target date from
          <input name="dueFrom" type="date" defaultValue={rawFilters.dueFrom} className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground" />
        </label>
        <label className="grid gap-1 text-xs text-muted-foreground">
          Target date to
          <input name="dueTo" type="date" defaultValue={rawFilters.dueTo} className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground" />
        </label>
        <div className="col-span-2 flex items-end gap-2 sm:col-span-2 lg:col-span-4">
          <Button type="submit">
            <Search aria-hidden="true" />
            Apply filters
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/projects">Clear</Link>
          </Button>
        </div>
      </form>

      <nav aria-label="Project display" className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {result.data.total} project{result.data.total === 1 ? "" : "s"}
        </p>
        <div className="inline-flex rounded-lg border bg-card p-1">
          {(["grid", "list"] as const).map((view) => {
            const params = new URLSearchParams();
            for (const [key, value] of Object.entries(preserve)) {
              if (Array.isArray(value)) {
                value.forEach((item) => params.append(key, item));
              } else if (value) {
                params.set(key, value);
              }
            }
            params.set("view", view);
            const selected = (rawFilters.view === "list" ? "list" : "grid") === view;
            return (
              <Link
                key={view}
                href={`/dashboard/projects?${params.toString()}`}
                aria-current={selected ? "page" : undefined}
                className={`rounded-md px-3 py-1.5 text-sm font-medium capitalize outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  selected ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {view === "grid"
                  ? <LayoutGrid aria-hidden="true" className="mr-1.5 inline size-4 align-text-bottom" />
                  : <List aria-hidden="true" className="mr-1.5 inline size-4 align-text-bottom" />}
                {view}
              </Link>
            );
          })}
        </div>
      </nav>

      {items.length === 0 ? (
        <section className="rounded-xl border border-dashed bg-card px-6 py-12 text-center">
          <h2 className="font-semibold">No projects match these filters</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Clear a filter or create a project to get started.
          </p>
          {result.data.canCreateProjects && (
            <Button asChild className="mt-5">
              <Link href="/dashboard/projects/new">Create project</Link>
            </Button>
          )}
        </section>
      ) : (
        <>
          {rawFilters.view === "list" ? (
            <div className="space-y-2">
              {items.map((project) => (
                <Link
                  key={project.id}
                  href={`/dashboard/projects/${project.id}`}
                  className="grid min-w-0 gap-3 rounded-lg border bg-card p-4 outline-none transition-colors hover:bg-muted/30 focus-visible:ring-2 focus-visible:ring-ring sm:grid-cols-[minmax(0,1.5fr)_minmax(120px,1fr)_auto] sm:items-center"
                >
                  <div className="min-w-0">
                    <p className="font-mono text-xs text-muted-foreground">{project.projectCode}</p>
                    <h2 className="mt-1 truncate font-semibold">{project.name}</h2>
                    <p className="mt-1 truncate text-sm text-muted-foreground">
                      {project.customer?.displayName ?? "Standalone project"}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <UserRound aria-hidden="true" className="size-3.5" />
                      {project.projectManager?.name ?? "No owner"}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <UsersRound aria-hidden="true" className="size-3.5" />
                      {project.members.length} team member{project.members.length === 1 ? "" : "s"}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <ListTodo aria-hidden="true" className="size-3.5" />
                      {project.taskCount} task{project.taskCount === 1 ? "" : "s"}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays aria-hidden="true" className="size-3.5" />
                      Starts {formatDate(project.startDate)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays aria-hidden="true" className="size-3.5" />
                      Due {formatDate(project.dueDate)}
                    </span>
                    <span>Updated {formatDate(project.updatedAt)}</span>
                    {project.budgetAmount !== null && (
                      <span>
                        Budget {project.currency} {project.budgetAmount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 sm:justify-end">
                    <Badge variant={statusVariants[project.status]}>{statusLabels[project.status]}</Badge>
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Flag aria-hidden="true" className="size-3.5" />
                      {project.priority.toLowerCase()}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
              {items.map((project) => (
                <Link
                  key={project.id}
                  href={`/dashboard/projects/${project.id}`}
                  className="flex min-w-0 flex-col rounded-lg border bg-card p-4 outline-none transition-colors hover:bg-muted/20 focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-mono text-xs text-muted-foreground">{project.projectCode}</p>
                      <h2 className="mt-1 break-words font-semibold">{project.name}</h2>
                    </div>
                    <Badge variant={statusVariants[project.status]}>{statusLabels[project.status]}</Badge>
                  </div>
                  <p className="mt-2 truncate text-sm text-muted-foreground">
                    {project.customer?.displayName ?? "Standalone project"}
                  </p>
                  <div className="mt-4 grid grid-cols-2 gap-3 border-t pt-3 text-sm">
                    <div className="min-w-0">
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <UserRound aria-hidden="true" className="size-3.5" />
                        Project manager
                      </p>
                      <p className="mt-1 truncate">{project.projectManager?.name ?? "Unassigned"}</p>
                    </div>
                    <div>
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <CalendarDays aria-hidden="true" className="size-3.5" />
                        Target date
                      </p>
                      <p className="mt-1">{formatDate(project.dueDate)}</p>
                    </div>
                    <div>
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <CalendarDays aria-hidden="true" className="size-3.5" />
                        Start date
                      </p>
                      <p className="mt-1">{formatDate(project.startDate)}</p>
                    </div>
                    <div>
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <UsersRound aria-hidden="true" className="size-3.5" />
                        Team
                      </p>
                      <p className="mt-1">{project.members.length} member{project.members.length === 1 ? "" : "s"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Tasks · Priority</p>
                      <p className="mt-1">{project.taskCount} · {project.priority.toLowerCase()}</p>
                    </div>
                    {project.budgetAmount !== null && (
                      <div className="col-span-2 border-t pt-2">
                        <p className="text-xs text-muted-foreground">Budget</p>
                        <p className="mt-1 tabular-nums">
                          {project.currency} {project.budgetAmount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                        </p>
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
          <nav aria-label="Project pages" className="flex justify-between gap-3">
            {canGoPrevious && previousCursor ? (
              <Button asChild variant="outline">
                <Link href={pageUrl(preserve, previousCursor, "previous")}>Previous</Link>
              </Button>
            ) : <span />}
            <span className="self-center text-sm text-muted-foreground">
              Showing {items.length} of {result.data.total} projects
            </span>
            {canGoNext && nextCursor ? (
              <Button asChild variant="outline">
                <Link href={pageUrl(preserve, nextCursor, "next")}>Next</Link>
              </Button>
            ) : <span />}
          </nav>
        </>
      )}
    </DashboardContainer>
  );
}
