#!/bin/sh
set -eu

url="$(cat /run/salary-cron-url)"
secret="$(cat /run/cron-secret)"

curl --fail-with-body --silent --show-error \
  --connect-timeout 10 --max-time 900 \
  --retry 3 --retry-all-errors \
  --request POST "$url" \
  --header "Authorization: Bearer $secret"
