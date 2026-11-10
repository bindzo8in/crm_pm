#!/bin/sh
set -eu

: "${ATTENDANCE_REMINDER_URL:?ATTENDANCE_REMINDER_URL must be set}"
: "${SALARY_CRON_URL:?SALARY_CRON_URL must be set}"
: "${SALARY_CRON_SECRET:?SALARY_CRON_SECRET must be set}"

umask 077
printf '%s' "$ATTENDANCE_REMINDER_URL" > /run/attendance-reminder-url
printf '%s' "$SALARY_CRON_URL" > /run/salary-cron-url
printf '%s' "$SALARY_CRON_SECRET" > /run/cron-secret
unset ATTENDANCE_REMINDER_URL SALARY_CRON_URL SALARY_CRON_SECRET

exec busybox crond -f -L /dev/stdout
