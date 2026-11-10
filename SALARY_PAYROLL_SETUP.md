# Salary Payroll Setup

## Monthly generation

The Docker Compose scheduler uses the `Asia/Kolkata` timezone for all cron entries. It calls `/api/salary/cron` at 02:30 IST on the first day of each month. The endpoint selects the previous month using the India calendar date, then generates and emails those slips after the attendance period has ended. Existing generated or paid slips are skipped; a retry can deliver an unsent scheduled slip without regenerating it.

Set `SALARY_CRON_SECRET` in the Compose environment for each deployment. Use the same strong random value of at least 32 characters in the web service environment and the scheduler. Do not commit the secret. Compose also requires `CONTAINER_NAME` to route scheduler requests to the web container.

Start or update both services with `docker compose up -d --build`. The scheduler container runs attendance reminders every five minutes and monthly payroll at the schedule above; both run on IST.

## Database migration

The schema adds adjustment amounts to salary slips. Apply the migration before deploying the app:

```sh
pnpm prisma migrate deploy
```

Existing slips keep any earlier one-off adjustments in their `customComponents` snapshot. The migration intentionally does not infer which similarly named components were one-off adjustments versus components configured in a salary structure.

## Salary workflow

- Employees can view only their own salary slips. Admins and HR can view slips for all employees.
- Admins/HR can create a slip manually, or monthly generation will create it from the saved salary structure.
- Routine generated salary slips do not require approval and are emailed by the monthly scheduler. Admins/HR can mark them paid or resend them.
- Admins/HR must approve a generated slip after adding a one-off reimbursement, earning, or deduction. Approval unlocks email delivery and payment recording for that adjusted balance.
- Admins/HR can record payment date, method, reference, and notes when marking a generated slip paid.
- Paid slips cannot be adjusted or marked paid again.
- Payroll keeps the existing calendar-day calculation and one permitted paid-leave rule; validate those policy assumptions with HR before relying on payroll amounts.
