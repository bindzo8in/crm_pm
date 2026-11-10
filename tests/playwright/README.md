# Attendance Playwright suite

This suite runs end-to-end checks against the real Bindzo8 CRM at `http://localhost:3000`. Attendance reads and writes mostly use Next.js Server Actions; the `/api/attendance/[action]` route is covered only where it actually exposes an HTTP endpoint.

## 1. Prepare the local application

Use a local or isolated test database only. Do not point these tests at production or a database containing attendance that must not be changed.

In the repository root, install dependencies and the Chromium browser:

```powershell
pnpm install
pnpm exec playwright install chromium
```

The main project README does not document environment setup. Create a local `.env` using your team's approved development values. This is loaded by both the app and Prisma CLI (`prisma.config.ts` imports `dotenv/config`). The app validates these variables at startup (see `lib/env.ts`):

- `DATABASE_URL` — connection string for the local/test PostgreSQL database.
- `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL` — local Better Auth configuration; use a strong local-only secret and a URL matching your app origin.
- `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPPORT_EMAIL`, `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`, and `NEXT_PUBLIC_APP_NAME`.
- `RESEND_API_KEY`, `MAIL_FROM`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `CHROMIUM_REMOTE_EXEC_PATH` — required by the app's current environment validation, even if a particular test does not exercise those integrations.
- `DIRECT_URL` — Prisma CLI datasource used by `prisma.config.ts`.

Do not copy production credentials or commit environment files. Ensure `DATABASE_URL` and `DIRECT_URL` both point only to a disposable/local test database. Once that is verified, prepare the generated client and apply pending migrations:

```powershell
pnpm exec prisma generate
pnpm exec prisma migrate deploy
```

`migrate deploy` changes the database. Do not run it until you have confirmed the target database is isolated and safe to modify. The repository's `seed-attendance.ts` seeds attendance for all active users, so it is not a safe way to create a dedicated Playwright employee.

Start the app in one terminal:

```powershell
pnpm dev
```

Keep that terminal open so you can see Next.js and database errors. In a second terminal, check the sign-in page is reachable:

```powershell
curl.exe -I http://localhost:3000/signin
```

If you use another local URL, set it in the test terminal before running Playwright:

```powershell
$env:PLAYWRIGHT_BASE_URL = "http://localhost:3001"
```

## 2. Run checks that do not need an account

The sign-in redirect test is safe to run without credentials:

```powershell
pnpm exec playwright test --config playwright.config.ts tests/playwright/attendance-page.spec.ts -g "unauthenticated users"
```

Run all tests with:

```powershell
pnpm test:e2e:attendance
```

Authenticated UI tests are skipped unless you set up a storage-state file in the next step. Anonymous browser/API tests explicitly start with empty storage state, so they remain anonymous even when `ATTENDANCE_E2E_STORAGE_STATE` is set for authenticated tests. The attendance API negative tests are intentionally strict: on the inspected local app they returned empty HTTP 500 responses instead of the expected HTTP 400/401 responses. Check the `pnpm dev` terminal for the underlying error; do not change those assertions just to make the suite green.

## 3. Verify first-admin signup lockout

This focused test requires a local app instance and test runner both targeting the disposable `crm_attendance_e2e` database. It does not reset the database or send verification email. Reset the database only after confirming the target is disposable; Prisma's configured reset also runs the CSV seed.

After resetting the database, create the single synthetic first administrator and run the test:

```powershell
pnpm exec tsx scripts/bootstrap-signup-e2e.ts seed
$env:PLAYWRIGHT_BASE_URL = "http://localhost:3001"
pnpm exec playwright test --config playwright.config.ts tests/playwright/bootstrap-signup.spec.ts
pnpm exec tsx scripts/bootstrap-signup-e2e.ts verify
```

The app instance at `PLAYWRIGHT_BASE_URL` must use that same test database, with `BETTER_AUTH_URL` and `NEXT_PUBLIC_SITE_URL` matching its origin. The guarded fixture refuses any database other than local `crm_attendance_e2e`, requires an empty user table when seeding, and verifies that the one synthetic SUPER_ADMIN is the only user afterward. The browser test checks the closed signup page, direct Better Auth signup (403), and bootstrap signup (409).

## 4. Create a test login and browser storage state

Use an existing, dedicated local test account that can access Attendance (an active department is required). Do not use a production employee's account. To test manager-only reports and shift rules, use a separate admin or HR test account.

Create a storage directory outside the repository, then open Playwright's interactive browser at the sign-in page:

```powershell
$authDir = Join-Path $env:LOCALAPPDATA "Bindzo8CRM\playwright"
New-Item -ItemType Directory -Force -Path $authDir | Out-Null
pnpm exec playwright codegen --save-storage="$authDir\attendance-staff.json" http://localhost:3000/signin
```

In the opened browser, sign in with the dedicated test account and verify you can open `/attendance`. Close the Codegen browser after signing in; Playwright saves the browser state to the specified JSON file. Treat this file like a password: it contains session cookies, must stay outside source control, and should only be used against your local/test app.

Tell the test runner where the file is (in the same PowerShell terminal that will run tests):

```powershell
$env:ATTENDANCE_E2E_STORAGE_STATE = Join-Path $env:LOCALAPPDATA "Bindzo8CRM\playwright\attendance-staff.json"
```

Run the read-only authenticated page, GPS, logs, analytics, and notification checks:

```powershell
pnpm exec playwright test --config playwright.config.ts tests/playwright/attendance-page.spec.ts tests/playwright/attendance-location.spec.ts tests/playwright/attendance-logs.spec.ts tests/playwright/attendance-analytics.spec.ts tests/playwright/attendance-notifications.spec.ts
```

The geolocation scenarios use Playwright's mocked browser location/errors; they do not use the computer's GPS. The manager-only files are skipped unless the manager account setup below is used.

## 5. Optional: manager reports and shift rules

Create another storage state using the same Codegen steps, signing in as an admin or HR test user. Set that file as the storage state and enable manager-only tests:

```powershell
$env:ATTENDANCE_E2E_STORAGE_STATE = Join-Path $env:LOCALAPPDATA "Bindzo8CRM\playwright\attendance-manager.json"
$env:ATTENDANCE_E2E_MANAGER = "true"
pnpm exec playwright test --config playwright.config.ts tests/playwright/attendance-reports.spec.ts tests/playwright/shift-rules.spec.ts
```

The shift-rules test checks invalid input but does not save settings. The Excel download/content test is skipped when no matching attendance records exist. To return to the staff account, set `ATTENDANCE_E2E_STORAGE_STATE` back to `attendance-staff.json` and remove the manager flag:

```powershell
$env:ATTENDANCE_E2E_STORAGE_STATE = Join-Path $env:LOCALAPPDATA "Bindzo8CRM\playwright\attendance-staff.json"
Remove-Item Env:ATTENDANCE_E2E_MANAGER -ErrorAction SilentlyContinue
```

## 6. Optional: real clock-in/out integration test

This test writes a real attendance record for the current day and cannot remove it. Only run it against an isolated test database with a dedicated employee account whose attendance record for today is not already present. Do not enable this for an ordinary employee or production account.

The account must be configured for Office work mode with office coordinates and geofence enforcement set up. Set the mocked coordinates to a point inside that test office's allowed radius:

```powershell
$env:ATTENDANCE_E2E_STORAGE_STATE = Join-Path $env:LOCALAPPDATA "Bindzo8CRM\playwright\attendance-staff.json"
$env:ATTENDANCE_E2E_EMPLOYEE_ID = "764d6ac2-46c8-4437-b07d-bfb294ab9df8"
$env:ATTENDANCE_E2E_ALLOW_MUTATIONS = "true"
$env:ATTENDANCE_E2E_LOCATION_LAT = "28.6139"
$env:ATTENDANCE_E2E_LOCATION_LNG = "77.2090"
pnpm exec playwright test --config playwright.config.ts tests/playwright/punch-clock.spec.ts -g "dedicated employee"
```

Replace the example coordinates with the test office's configured coordinates. `ATTENDANCE_E2E_EMPLOYEE_ID` is an explicit opt-in guard; use the ID of the exact dedicated account whose storage state you captured. The test skips if that account already has an attendance record today. Because attendance is retained, a successful run is not repeatable for the same account on the same day. The test does not seed or delete attendance.

## 7. Seed and run a complete month with role and department coverage

The schema has one company profile for the database; it does not have multiple tenant companies. Use one disposable database to represent the test company. The fixture does not change the company profile. It creates or reuses only marked `attendance-e2e+...@bindzo8.invalid` users:

- `SUPER_ADMIN` Founder / CEO
- `ADMIN` Operations Administrator
- `STAFF` in SALES, DEVELOPMENT, DESIGN, SEO, MARKETING, HR, and OPERATIONS

The HR staff persona exercises the app's HR manager attendance access. Seeded attendance covers every configured workday in one complete calendar month, with deterministic PRESENT, LATE, HALF_DAY, and ABSENT records. By default the month is the previous completed month; set `ATTENDANCE_E2E_MONTH` to a specific `YYYY-MM` in both setup and test terminals to override it.

The seed command refuses to run unless the database URL matches a local PostgreSQL database whose name contains `attendance_e2e`, and you set an explicit target and confirmation phrase. Do not copy production credentials or run this against a database containing real employees:

The root `.env.test` file contains local-only Playwright flags, password, and month settings. It is git-ignored; do not copy production secrets into it. Playwright and the seed script load it automatically. The Next.js dev server still reads `.env` in development, so make sure its `DATABASE_URL` and `DIRECT_URL` point to the same isolated database.

```powershell
# Use a disposable local PostgreSQL database named, for example, crm_attendance_e2e.
# First point DATABASE_URL and DIRECT_URL in the local .env at that database.
# This loads DATABASE_URL from .env without printing the connection string.
$env:ATTENDANCE_E2E_DATABASE_URL = (node -e "require('dotenv').config({ path: '.env.test', quiet: true }); require('dotenv').config({ quiet: true }); process.stdout.write(process.env.DATABASE_URL)")
pnpm seed:e2e:attendance
```

Each run synchronizes the password for marked accounts with Better Auth's configured password hasher, then verifies it before creating attendance data. Re-running the seed refreshes the marked users' profile, replaces attendance rows for those marked users and the selected month, and clears only those marked users' records for today so the visual clock-in/out flow can be repeated. It does not delete other employee data. The seed requires the generated Prisma client and current migrations.

Start (or restart) the app against the same isolated database, then run the role-based browser tests in another terminal. `.env.test` is loaded automatically by Playwright:

```powershell
pnpm test:e2e:attendance:month
```

This suite signs in through the real UI. It checks SUPER_ADMIN analytics and export, ADMIN log visibility and pagination, HR STAFF report access, and STAFF-only attendance visibility. It does not perform live clock-in/out or alter application business logic. Keep test accounts and records confined to the disposable database. Run `pnpm test:e2e:attendance` separately for the existing attendance checks; authenticated tests in that suite still use the storage-state setup described above.

## 8. Run the full visual attendance journey

The visual workflow logs into the UI as each of the seven marked STAFF personas, clocks each one in and out using mocked GPS coordinates, checks the resulting daily log as ADMIN, adjusts a seeded monthly Sales record, verifies its audit trail and report presentation as HR, and exports the completed month as SUPER_ADMIN. Each browser journey is reported as named Playwright steps, and milestone screenshots are attached to the HTML report. It does not simulate 27 days of real-time punching; the prior-month records are deterministic test fixtures, while today's check-in/out is performed through the real UI.

This workflow writes attendance records and is intentionally limited to a local app URL and the marked E2E accounts. Before running it:

- Use the isolated local `attendance_e2e` database and the seeded roster described above.
- Seed the chosen completed month. The seed replaces marked test-account data for that month and clears only today's attendance records belonging to those marked accounts, making the visual punch flow repeatable.
- Ensure Attendance shift rules have a configured office location. Set `ATTENDANCE_E2E_LOCATION_LAT` and `ATTENDANCE_E2E_LOCATION_LNG` in `.env.test` to coordinates inside that location's allowed geofence; the visual flow stays skipped while either value is blank.
- Do not use a production URL, real employee account, or real GPS coordinates.

Run the visual flow after filling in the test-office coordinates:

```powershell
pnpm test:e2e:attendance:visual
```

To watch the workflow and individual test steps in Playwright UI Mode instead:

```powershell
pnpm test:e2e:attendance:ui
```

The UI Mode run also creates the HTML report and failure artifacts under `playwright-report/` and `test-results/`.

## Reports, traces, and troubleshooting

The Playwright HTML report is generated at `playwright-report/index.html`. Open it with:

```powershell
pnpm test:e2e:attendance:report
```

Failure screenshots, traces, and videos are saved under `test-results/`. To inspect a trace:

```powershell
pnpm exec playwright show-trace test-results\<failed-test-folder>\trace.zip
```

If authenticated tests redirect to sign-in, regenerate the storage state after signing in and verify the test account can open Attendance. If a browser cannot launch, rerun `pnpm exec playwright install chromium`. If requests fail or return HTTP 500, inspect the app terminal and verify its local environment and database before rerunning.

## Test files and scope

- `attendance-page.spec.ts`: unauthenticated redirect, default kiosk content, responsive breakpoints, and horizontal overflow.
- `punch-clock.spec.ts`: unauthenticated clock-out response and opt-in real clock-in/out integration.
- `attendance-location.spec.ts`: mocked successful location, permission denial, unavailable GPS, timeout, retry, and weak accuracy.
- `attendance-logs.spec.ts`: log columns, date-filtered empty data, and pagination when available.
- `attendance-analytics.spec.ts`: analytics summary and filters.
- `attendance-reports.spec.ts`: manager date range, Excel download format, and filtered record count.
- `shift-rules.spec.ts`: manager shift-rule dialog and invalid time input.
- `attendance-notifications.spec.ts`: notification permission denial and controls.
- `attendance-api-negative.spec.ts`: applicable HTTP 400 and 401 responses.
- `attendance-monthly.spec.ts`: isolated full-month, multi-role and all-department integration workflow.
- `bootstrap-signup.spec.ts`: first-admin registration lockout through the signup UI and both signup endpoints.

The existing specs do not seed, edit, or delete attendance records. The separate monthly suite is opt-in and uses the guarded `seed:e2e:attendance` command described above. API statuses 403, 404, and 500 are not asserted as expected attendance behavior unless an applicable route/business case is identified.

## CRM CRUD mutation suite

`crm-crud.spec.ts` exercises create/edit flows and representative validation boundaries for customers, invoices, proposals, projects, project tasks, and expenses. These tests create persistent records and do not clean them up. Run them only against a disposable database and a dedicated account authorized for all six modules.

Before opting in, confirm that both the running app and Playwright runner use the same isolated database. Set the following values in the test shell; the database name must contain `e2e`, `test`, or `disposable`:

```powershell
$env:CRM_E2E_STORAGE_STATE = Join-Path $env:LOCALAPPDATA "Bindzo8CRM\playwright\crm-admin.json"
$env:CRM_E2E_DATABASE_NAME = "crm_crud_e2e"
$env:CRM_E2E_APP_DATABASE_NAME = "crm_crud_e2e"
$env:CRM_E2E_CONFIRM_DATABASE = "crm_crud_e2e"
$env:CRM_E2E_RUN_MUTATIONS = "true"
```

`DATABASE_URL` from `.env.test` must point to `CRM_E2E_DATABASE_NAME`. `CRM_E2E_APP_DATABASE_NAME` and `CRM_E2E_CONFIRM_DATABASE` are explicit operator confirmations; they do not inspect or reconfigure an already-running app. Verify its environment manually before testing. The suite is skipped by default and fails closed if any configured database name or the storage-state file does not match. The storage state is sensitive and must remain outside source control.

Run the suite with:

```powershell
pnpm test:e2e:crm:crud
```

It intentionally leaves created records in the disposable database. Expense testing also creates a unique expense category, and invoice/proposal/expense cases create their own customers. Do not run it against production, shared development data, or any database whose contents must be retained.

If you explicitly authorize persistent test records in a non-disposable local database, set `CRM_E2E_ALLOW_NON_DISPOSABLE_DATABASE=true` for that run and ensure all four database names above match exactly. This bypasses only the disposable-name check; it does not bypass the matching database or storage-state checks. The suite does not automatically clean up records.
