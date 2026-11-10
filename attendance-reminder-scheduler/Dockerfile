# syntax=docker/dockerfile:1

FROM alpine:3.22

RUN apk add --no-cache curl tzdata \
    && cp /usr/share/zoneinfo/Asia/Kolkata /etc/localtime \
    && echo "Asia/Kolkata" > /etc/timezone

ENV TZ=Asia/Kolkata

COPY --chmod=0644 crontab /etc/crontabs/root
COPY --chmod=0755 entrypoint.sh /usr/local/bin/entrypoint.sh
COPY --chmod=0755 send-reminders.sh /usr/local/bin/send-reminders.sh
COPY --chmod=0755 send-monthly-salary.sh /usr/local/bin/send-monthly-salary.sh

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
