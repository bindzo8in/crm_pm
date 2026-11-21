# Prioritized Architecture and Implementation Checklist

## P0 — Decisions and security prerequisites

- [ ] Approve modular-monolith-first architecture and extraction criteria.
- [ ] Decide whether organization represents SaaS tenant, internal workspace, or both.
- [ ] Decide employee/workforce/payroll tenant ownership and visibility.
- [ ] Define platform roles vs org roles vs CRM roles vs record scopes.
- [ ] Classify each Prisma model as tenant-owned, platform-global or employee-only.
- [ ] Audit every action/API/export/upload/download/realtime/job for membership, permission, scope and tenant predicates.
- [ ] Define retention, suspension, export, deletion and legal hold policies.
- [ ] Confirm production TLS/proxy/rate limits, secrets, backup/restore, monitoring and incident process.

## P1 — Harden the current app

- [ ] Require tenant context for tenant-owned repositories.
- [ ] Backfill tenant IDs with audited ownership mapping; remove nullable ownership where required.
- [ ] Add tenant-aware unique constraints, composite FKs and measured indexes.
- [ ] Pilot RLS with a non-bypass runtime role.
- [ ] Add cross-tenant negative tests for records, files, exports, realtime and jobs.
- [ ] Establish permission matrix and resolve ambiguous overlaps without unintended grants.
- [ ] Preserve immutable sent proposals and paid invoices.
- [ ] Move high-risk direct persistence from actions into application services.

## P2 — Service-ready foundations

- [ ] Define REST DTOs, common errors, pagination, API versioning and idempotency.
- [ ] Add correlation IDs and redacted structured logs, metrics and health probes.
- [ ] Define service-owned schemas/migrations; prohibit cross-service DB access.
- [ ] Select RabbitMQ only when async needs are established; set retry/DLQ policy.
- [ ] Add outbox/inbox and replay runbook before relying on events.
- [ ] Define Better Auth token/session verification and service identity.
- [ ] Pilot NestJS gateway route with parity and rollback.

## P3 — Selective extraction

- [ ] Select first capability from measured need (notification worker or reporting projection are candidates).
- [ ] Extract Work or People only with clear ownership, tenant semantics and independent scaling/release reason.
- [ ] Keep proposal/invoice transactions together until decomposition is justified.
- [ ] Add subscription Billing only if SaaS plans enter scope.
- [ ] Add Redis, Kubernetes, Kafka or extra discovery tools only when justified.

## Definition of done

- [ ] Existing behavior preserved; validation and authorization server-side.
- [ ] Tenant isolation tests pass; migration rehearsed with rollback.
- [ ] TypeScript, lint, build and appropriate tests pass.
- [ ] UI loading, empty, error, dark and mobile states handled where changed.
- [ ] Logs, metrics, alerts and runbooks updated.
- [ ] Deployment, backup and recovery reviewed.
