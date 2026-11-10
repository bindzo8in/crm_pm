# Leave and holiday management

## Access

| User | Leave requests | Leave review | Holiday calendar | Holiday management |
| --- | --- | --- | --- | --- |
| Staff with at least one department membership | Submit, view own requests, cancel own pending requests | No | View | No |
| Staff whose primary department is HR | Submit and view own requests | Review any staff request in one step; cannot review own request | View | Create, edit, delete |
| Admin or Super Admin | Submit and view own requests | Review any staff request in one step; cannot review own request | View | Create, edit, delete |
| Staff without any department membership | Workspace setup notice; protected module access is denied | No | No | No |

Authorization is enforced in the server actions as well as the page and navigation layers.
Additional department memberships count for department matching and visibility, but do not grant department-specific permissions; those continue to depend on the primary department.

## Leave policy

- Annual Leave is the only paid leave type. The allowance is one chargeable day per calendar month, expires at the end of that month, and does not carry forward.
- Only approved Annual Leave uses the monthly allowance. Pending requests do not reserve it; approval checks all affected calendar months and rejects requests that exceed an allowance.
- Sick, Casual, and Unpaid leave are unpaid and do not use the Annual Leave allowance.
- A request cannot overlap another pending or approved request from the same employee. Employees can cancel only their own pending requests.
- Days are counted inclusively. The work schedule at `/dashboard/attendance/schedule` defines non-working days; it defaults to Sunday only, so Saturday is a working day unless the schedule is changed. Configured non-working days and applicable full-day holidays are excluded. A half-day holiday reduces chargeable leave by 0.5 day; a holiday on a non-working day is counted once.
- Requests store their day totals and month allocation when submitted. Changing the weekly schedule or editing/deleting a holiday does not recalculate existing requests.

## Holiday calendar

Holidays apply to the whole company. HR staff and administrators may manage holidays; all assigned staff may view them. A calendar date can have only one holiday entry. A half-day holiday applies to every date in its selected range: employees are expected to work the other half, attendance reporting treats the date as a scheduled half day, and leave requests charge 0.5 day for it.

The leave/holiday migration adds a unique constraint on holiday dates. It intentionally stops with an explanatory error if duplicate dates already exist, rather than deleting or merging holiday records. Resolve any duplicates deliberately before deploying that migration.
