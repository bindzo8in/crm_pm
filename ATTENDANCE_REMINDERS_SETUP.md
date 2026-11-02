# Attendance reminders

Admins and Super Admins can set the reminder time in Attendance → Shift Rules. The scheduler checks every five minutes and sends reminders only between that time and the expected shift start, in IST. It skips configured weekends, applicable holidays, approved leave, inactive employees, and employees with an attendance record for the day.

Each user can enable browser notifications on the device they use to access Attendance. In-app notifications continue to work when browser push is not configured.

## Deployment configuration

For each GitHub Actions environment used by the app, configure:

- `NEXT_PUBLIC_SITE_URL` as an environment variable.
- `SALARY_CRON_SECRET` as an environment secret of at least 32 characters, matching the app deployment secret.
- `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` as environment secrets.

Generate a VAPID key pair locally with `pnpm exec web-push generate-vapid-keys`. Store the generated values directly in GitHub and the deployment environment; never commit them. Configure the same key pair for the app and its scheduled workflow environment. Browser push requires HTTPS and the user’s browser notification permission.

The GitHub Actions schedule invokes `/api/attendance/reminders/cron` every five minutes using the existing `SALARY_CRON_SECRET`. In-app reminders do not require VAPID keys; browser push does.

## Local migration

Apply the schema migration with:

```sh
pnpm exec prisma migrate deploy
```
