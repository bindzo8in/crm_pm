# Attendance reminders

Admins and Super Admins can set the reminder time in Attendance → Shift Rules. The scheduler checks every five minutes and sends reminders only between that time and the expected shift start, in IST. It skips configured weekends, applicable holidays, approved leave, inactive employees, and employees with an attendance record for the day.

Each user can enable browser notifications on the device they use to access Attendance. In-app notifications continue to work when browser push is not configured.

At the configured shift end, employees who are still clocked in receive one in-app clock-out reminder. Each employee can independently opt in to push alarms at the configured shift start and end under Attendance settings. Clock-in alarms are skipped after the employee has clocked in and on weekends, applicable holidays, or approved leave. Push alarms require browser alerts to be enabled on the device; audible behavior is controlled by the browser and operating system.

Attendance reminder scheduling runs in one Docker Compose service alongside the shared multi-tenant production app. The scheduler uses the `Asia/Kolkata` timezone and checks every five minutes; the app sends reminders only between the configured reminder time and shift start (IST), and only to eligible staff who have not checked in, taken approved leave, or reached a weekend/holiday. Outside that window, the endpoint reports that it skipped delivery. The shared deployment runs one scheduler; do not configure a separate schedule per tenant.

The reminder endpoint reports `notified` (new in-app reminders), `pushSent` (successful browser deliveries), `pushSkipped` (eligible users without a push attempt, such as no subscription), and `pushFailures` (push delivery/configuration failures). Review production with `docker compose logs -f attendance-reminder-scheduler` from `~/apps/crm`. The optional GitHub Actions **Run workflow** trigger is manual only and targets the shared production instance; it is not needed for scheduled reminders.

## Deployment configuration

The CI/CD deployment copies `docker-compose.yml`, writes the production `.env`, pulls the app and scheduler images, and runs `docker compose up -d`. This starts the lightweight cron scheduler alongside the app automatically; no VPS crontab setup is needed.

Configure `SALARY_CRON_SECRET` in the GitHub Actions `production` environment and keep the matching value in the server `.env`; do not commit it. The scheduler calls the app over the Docker network using the `CONTAINER_NAME` alias, so it does not depend on public DNS or HTTPS.

Generate a VAPID key pair locally with `pnpm exec web-push generate-vapid-keys`. Configure the values in the GitHub Actions `production` environment and server runtime environment; never commit them. Browser push requires HTTPS and the user's browser notification permission.

In-app reminders do not require VAPID keys; browser push does. Deploy the updated Compose file through CI/CD to start the scheduler. The GitHub Actions workflow remains available for manual production runs; scheduled reminders are handled by Compose.

## Local migration

Apply the schema migration with:

```sh
pnpm exec prisma migrate deploy
```
