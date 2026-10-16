# Project management

Projects are managed at `/dashboard/projects`. The list supports text, status,
priority, target-date, sort, and cursor-page filters. Each project has a detail
view for ownership, schedule, scope, tasks, activity, and linked CRM records.

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
or a project member.

## Database migration

The project tables and indexes are defined in
`prisma/migrations/20261016120000_project_management_module/migration.sql`.
The migration is intentionally not applied as part of this implementation.
