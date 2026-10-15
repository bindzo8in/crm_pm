# Salary Payroll Setup

## Monthly generation

`.github/workflows/monthly-salary.yml` calls `/api/salary/cron` on the first day of each month at 02:15 UTC. The endpoint generates slips for the **previous** month, after that month’s attendance period has ended. Existing generated or paid slips are skipped, so retrying the workflow does not create duplicates.

Configure the following for each GitHub Actions environment used by the workflow (`crm-bindzo8` and `crm-designhub`):

- Environment variable `NEXT_PUBLIC_SITE_URL`: the base URL for that CRM deployment.
- Environment secret `SALARY_CRON_SECRET`: a strong random value of at least 32 characters.

Set the same `SALARY_CRON_SECRET` in the matching application deployment environment. Do not commit the secret. The workflow can also be triggered manually from GitHub Actions; it will still process the previous calendar month.

## Database migration

The schema adds adjustment amounts to salary slips. Apply the migration before deploying the app:

```sh
pnpm prisma migrate deploy
```

Existing slips keep any earlier one-off adjustments in their `customComponents` snapshot. The migration intentionally does not infer which similarly named components were one-off adjustments versus components configured in a salary structure.

## Salary workflow

- Employees can view only their own salary slips. Admins and HR can view slips for all employees.
- Admins/HR can create a slip manually, or monthly generation will create it from the saved salary structure.
- Admins/HR can adjust medical reimbursement, additional earnings, or deductions while a slip is generated but unpaid.
- Admins/HR can record payment date, method, reference, and notes when marking a generated slip paid.
- Paid slips cannot be adjusted or marked paid again.
- Payroll keeps the existing calendar-day calculation and one permitted paid-leave rule; validate those policy assumptions with HR before relying on payroll amounts.
