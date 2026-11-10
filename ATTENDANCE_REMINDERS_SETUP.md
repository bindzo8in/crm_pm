# Attendance reminders

Admins and Super Admins can set the reminder time in Attendance → Shift Rules. The scheduler checks every five minutes and sends reminders only between that time and the expected shift start, in IST. It skips configured weekends, applicable holidays, approved leave, inactive employees, and employees with an attendance record for the day.

Each user can enable browser notifications on the device they use to access Attendance. In-app notifications continue to work when browser push is not configured.

Attendance reminder scheduling runs in a Docker Compose service deployed with each app. The scheduler uses the `Asia/Kolkata` timezone and checks every five minutes; the app sends reminders only between the configured reminder time and shift start (IST), and only to eligible staff who have not checked in, taken approved leave, or reached a weekend/holiday. Outside that window, the endpoint reports that it skipped delivery.

The reminder endpoint reports `notified` (new in-app reminders), `pushSent` (successful browser deliveries), `pushSkipped` (eligible users without a push attempt, such as no subscription), and `pushFailures` (push delivery/configuration failures). Review a specific deployment with `docker compose logs -f attendance-reminder-scheduler` from that app's server directory. The optional GitHub Actions **Run workflow** trigger is manual only and is not needed for scheduled reminders; a manual run can notify all eligible employees for each configured environment.

## Deployment configuration

The CI/CD deployment copies `docker-compose.yml` and the scheduler image source, writes the app's `.env`, and runs `docker compose up -d --build`. This builds and starts the lightweight cron scheduler alongside the app automatically; no VPS crontab setup is needed. Each app deployment runs its own scheduler container and uses that app's `SALARY_CRON_SECRET`.

Configure `SALARY_CRON_SECRET` in the CI/CD environment for every app, as already required by the reminder endpoint. Keep the matching value in that app's server `.env`; do not commit it. The scheduler calls the app over the Docker network using its unique container name, so it does not depend on public DNS or HTTPS.

Generate a VAPID key pair locally with `pnpm exec web-push generate-vapid-keys`. Configure the values in the app's CI/CD environment and runtime environment; never commit them. Browser push requires HTTPS and the user's browser notification permission.

In-app reminders do not require VAPID keys; browser push does. Deploy the updated Compose file through CI/CD to start the scheduler and stop using the GitHub Actions schedule.

## Local migration

Apply the schema migration with:

```sh
pnpm exec prisma migrate deploy
```
