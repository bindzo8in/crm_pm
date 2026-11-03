# Project management

Projects are managed at `/dashboard/projects`. The directory supports grid and
list layouts, text search, status, priority, project manager, team member,
target-date, overdue, sort, and cursor-page filters. Status, priority, manager,
and team-member filters support searchable multi-selection with icons. Each
project workspace has Overview, Tasks, Board, Team, and Activity views.

Tasks are also available across projects at `/dashboard/tasks`. The task
workspace supports all accessible, assigned, created, upcoming, overdue, and
completed views, along with status/priority filters, list and board layouts,
quick creation, and inline status changes. Task status and priority filters
support searchable multi-selection with icons. Cards on both task boards can be
dragged between status columns; keyboard users can focus a drag handle and use
Space and the arrow keys, and the status selector remains available as an
alternative. Moves save through the existing permission-checked task action
and revert in the interface if saving fails. Tasks cannot be reordered within
a column because the data model has no manual ordering field. Users with
organization-wide task
access see all active-project tasks; staff task visibility remains limited to
tasks assigned to them. Task creation from the task workspace offers the first
100 projects; other projects can still be used by creating a task in that
project's workspace.

Selecting a task in either workspace opens its detail panel. The panel supports
task dates, assignees, priority, estimates, sprint points, subtasks, blocking
and related-task links, checklist items, comments, Cloudinary attachments, and
per-user time tracking. Project members can open tasks from their project
workspace; the cross-project task workspace continues to follow task
assignment/read permissions.

Task creation in either workspace uses the shared task composer for project and
folder selection, status, assignee, priority, dates, estimate, and sprint
points. Project task views can be filtered by folder, and tasks can be moved
between folders from the list or board. Each project starts with a General
folder. Project members with update permission can add nested folders, rename
or move them, and delete them; deleting a folder preserves its tasks by moving
them to a suitable parent or project folder.

## Task workflows

Each project has its own copy of a task workflow. Project managers with project
update permission can start from the built-in Normal, Content, Kanban,
Marketing, or Scrum templates, rename/recolor statuses, add statuses, and
assign each status to one of four groups: Not started, Active, Done, or Closed.
Saving a workflow as a template makes it available to other projects without
changing workflows already in use.

Project team assignments are managed separately at
`/dashboard/projects/[id]/team`; the project details editor does not change
the project manager or team members.

Tasks in the Done group count as completed. Closed tasks are terminal and are
excluded from open and overdue counts, but do not count as completed. New tasks
start in the project's first Not started status. A status used by existing
tasks cannot be removed until those tasks are moved elsewhere. Updating a
status group also updates the group and completion timestamp of tasks in that
status. The task hub groups its compact list by the configured statuses and
uses the same statuses for board columns and filters.

## Access

- Administrators can list and manage all projects, teams, budgets, and tasks.
- Staff can only open projects where they are the project manager or a team
  member. Staff can change project status and update the status of tasks
  assigned to them.
- Project actions validate permissions and inputs on the server. Hiding an
  action in the interface is not the access-control boundary.
- Budget values and internal notes are omitted from responses unless the user
  has the corresponding management permission.

## Proposal conversion

Only accepted proposals can be converted. The original proposal is retained as
an immutable snapshot on the project. A unique `proposalId` constraint makes
conversion idempotent: repeated requests resolve to the same project rather
than creating duplicates.

Customer-linked projects can also be created from the customer record. Projects
may be standalone when no customer is selected.

## Lifecycle and tasks

Projects move through planning, not started, in progress, on hold, completed,
and cancelled states. The server enforces valid transitions and records status
changes in project activity. Tasks are assignable only to the project manager
or a project member. The database migration maps the existing task statuses to
the default Normal workflow while preserving each task's status.

## Database migration

The project tables and indexes are defined in
`prisma/migrations/20261016120000_project_management_module/migration.sql`.
Task workflow templates and the forward migration from fixed task statuses are
defined in
`prisma/migrations/20261103150346_dynamic_project_task_workflows/migration.sql`.
Empty project workflow configurations are repaired, and the database default
is set to the valid Normal workflow, in
`prisma/migrations/20261103154500_repair_empty_project_task_workflows/migration.sql`.
Task preview fields and related records are added by
`prisma/migrations/20261103161500_project_task_preview_features/migration.sql`.
Project task folders and the backfill assigning existing tasks to General are
added by
`prisma/migrations/20261103165000_project_task_folders/migration.sql`.
Apply pending Prisma migrations as part of the normal deployment process before
using configurable task workflows, task preview features, and project task
folders.
