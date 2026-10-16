import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import DashboardContainer from "@/app/dashboard/dashboard-container";
import { getProjects } from "@/actions/project";
import { projectQuerySchema } from "@/lib/schemas/project-schema";
import { requirePageAccess } from "@/lib/auth-guard";
import { notFound } from "next/navigation";

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

function formatDate(value: Date | string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function pageUrl(
  searchParams: Record<string, string | undefined>,
  cursor: number,
  direction: "next" | "previous",
) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (value) params.set(key, value);
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
  const rawFilters = {
    search: scalar(params.search),
    status: scalar(params.status),
    priority: scalar(params.priority),
    customerId: scalar(params.customerId),
    projectManagerId: scalar(params.projectManagerId),
    dueFrom: scalar(params.dueFrom),
    dueTo: scalar(params.dueTo),
    cursor: scalar(params.cursor),
    direction: scalar(params.direction),
    sortDirection: scalar(params.sortDirection),
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
      key !== "cursor" && key !== "direction" && Boolean(value),
    ),
  ) as Record<string, string | undefined>;

  return (
    <DashboardContainer
      title="Projects"
      action={result.data.canCreateProjects
        ? { href: "/dashboard/projects/new", label: "Create project", icon: <Plus /> }
        : undefined}
    >
      <section aria-label="Project summary" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {[
          ["Total", summary.total],
          ["Active", summary.active],
          ["Planning", summary.planning],
          ["Due in 7 days", summary.dueSoon],
          ["Overdue", summary.overdue],
          ["Completed", summary.completed],
        ].map(([label, value]) => (
          <article key={label} className="rounded-xl border bg-card p-4">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
          </article>
        ))}
      </section>

      <form method="GET" className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
        <input
          name="search"
          defaultValue={rawFilters.search}
          aria-label="Search projects"
          className="h-10 min-w-0 rounded-md border border-input bg-background px-3 text-sm"
          placeholder="Search projects, code, customer"
        />
        <select aria-label="Filter by status" name="status" defaultValue={rawFilters.status ?? ""} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
          <option value="">All statuses</option>
          {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <select aria-label="Filter by priority" name="priority" defaultValue={rawFilters.priority ?? ""} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
          <option value="">All priorities</option>
          {["LOW", "MEDIUM", "HIGH", "URGENT"].map((value) => <option key={value} value={value}>{value[0]}{value.slice(1).toLowerCase()}</option>)}
        </select>
        <select aria-label="Sort projects" name="sortDirection" defaultValue={rawFilters.sortDirection === "asc" ? "asc" : "desc"} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
          <option value="desc">Newest first</option>
          <option value="asc">Oldest first</option>
        </select>
        <label className="grid gap-1 text-xs text-muted-foreground">
          Target date from
          <input name="dueFrom" type="date" defaultValue={rawFilters.dueFrom} className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground" />
        </label>
        <label className="grid gap-1 text-xs text-muted-foreground">
          Target date to
          <input name="dueTo" type="date" defaultValue={rawFilters.dueTo} className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground" />
        </label>
        <div className="flex items-end gap-2 sm:col-span-2">
          <Button type="submit">Apply filters</Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/projects">Clear</Link>
          </Button>
        </div>
      </form>

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
          <div className="grid gap-3 lg:hidden">
            {items.map((project) => (
              <Link
                key={project.id}
                href={`/dashboard/projects/${project.id}`}
                className="rounded-xl border bg-card p-4 shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-mono text-xs text-muted-foreground">{project.projectCode}</p>
                    <h2 className="mt-1 break-words font-semibold">{project.name}</h2>
                  </div>
                  <Badge variant={statusVariants[project.status]}>{statusLabels[project.status]}</Badge>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  {project.customer?.displayName ?? "Standalone project"}
                </p>
                <div className="mt-4 grid grid-cols-2 gap-3 border-t pt-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Project manager</p>
                    <p className="mt-1">{project.projectManager?.name ?? "Unassigned"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Target date</p>
                    <p className="mt-1">{formatDate(project.dueDate)}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div className="hidden overflow-hidden rounded-xl border bg-card lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Project manager</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Target date</TableHead>
                  <TableHead>Updated</TableHead>
                  {items.some((project) => project.budgetAmount !== null) && <TableHead className="text-right">Budget</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((project) => (
                  <TableRow key={project.id}>
                    <TableCell>
                      <Link href={`/dashboard/projects/${project.id}`} className="font-medium hover:underline">
                        {project.name}
                      </Link>
                      <p className="mt-1 font-mono text-xs text-muted-foreground">{project.projectCode}</p>
                    </TableCell>
                    <TableCell>{project.customer?.displayName ?? "Standalone"}</TableCell>
                    <TableCell>{project.projectManager?.name ?? "Unassigned"}</TableCell>
                    <TableCell>{project.members.length} member{project.members.length === 1 ? "" : "s"}</TableCell>
                    <TableCell><Badge variant={statusVariants[project.status]}>{statusLabels[project.status]}</Badge></TableCell>
                    <TableCell>{project.priority[0]}{project.priority.slice(1).toLowerCase()}</TableCell>
                    <TableCell>{formatDate(project.dueDate)}</TableCell>
                    <TableCell>{formatDate(project.updatedAt)}</TableCell>
                    {items.some((item) => item.budgetAmount !== null) && (
                      <TableCell className="text-right tabular-nums">
                        {project.budgetAmount === null
                          ? "—"
                          : `${project.currency} ${project.budgetAmount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
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
