# Implementation Roadmap

This is a prioritized proposal. **Do not change application source until the architecture is approved.** Preserve existing behavior and use rollout/rollback switches where appropriate.

## Milestone 1 — Baseline and approval (current)

- Tasks: inspect source, verify tenant/product assumptions, define role matrix, lifecycle, RPO/RTO and target boundaries.
- Files: `docs/architecture/*`, checklist.
- Dependencies: product decision on SaaS tenants vs current company/employee workspace.
- Deliverable: approved architecture and sequence.
- Acceptance: every current model/query has an owner and tenant classification; risks are assigned.
- Verification: architecture review and query-path inventory. Documentation is complete; runtime/security verification remains.

## Milestone 2 — Tenant and authorization hardening

- Tasks: classify models, audit all server actions/routes, standardize `TenantContext`, resolve roles, test cross-tenant access, backfill tenant columns, add composite constraints and pilot RLS.
- Files: Prisma schema/migrations, auth helpers, repositories/application services, tests.
- Dependencies: employee/workforce ownership decision.
- Deliverable: tenant-isolated baseline.
- Acceptance: foreign-tenant reads/writes/files/jobs fail; tenant row cannot be created without context.
- Verification: negative tests and migration rehearsal on sanitized copy.

## Milestone 3 — Modular monolith boundaries

- Tasks: extract action persistence into application services/repositories; define CRM Core, Work and People boundaries and DTOs; refactor large workflows incrementally.
- Files: `actions/`, `repositories/`, `services/`, schemas/tests.
- Dependencies: milestone 2.
- Deliverable: module APIs inside existing app, no feature regression.
- Acceptance: cross-module writes use declared interfaces; current workflows remain compatible.
- Verification: unit/integration/E2E on affected flows.

## Product capability roadmap (gated by customer validation)

Before building competitor-benchmarked modules, validate demand and define lifecycle semantics. A plausible dependency order is:

1. Leads and conversion into existing customer/contact records.
2. Distinct Accounts and Deals/opportunity stages linked to contacts and proposals.
3. General Activities (tasks, meetings, calls, visits) linked to leads/contacts/deals; reuse project tasks only where semantics fit.
4. Forecasting from deal stages/probabilities with time-bound snapshots.
5. Sales Orders and accepted-proposal → order → invoice lifecycle.
6. Vendors and Purchase Orders as procurement capability.
7. Customer Support Cases and Solutions/knowledge, separate from internal issue reports.
8. Campaigns and SalesInbox/social after provider, consent and sync requirements are known.
9. General Documents library using Cloudinary/PDF foundations with tenant/resource ACLs.

This is a dependency proposal, not a feature commitment. Approved capabilities first belong in CRM Core, Work/Activity, Procurement, Support or Communication modules; reconsider service extraction only when evidence supports it.

## Milestone 4 — Contracts and observability

- Tasks: common API/error envelope, request IDs, structured redacted logs, metrics/tracing, typed client, versioning.
- Files: contract library/equivalent, handlers, telemetry.
- Dependencies: module boundaries.
- Deliverable: stable observable contracts.
- Acceptance: consistent errors, traceable tenant context, PII redaction.
- Verification: contract tests and log review.

## Milestone 5 — Durable jobs/events

- Tasks: choose RabbitMQ hosting, add transactional outbox/inbox, retry/DLQ and idempotency; migrate one reminder/notification flow.
- Files: worker, outbox schema, Compose, event definitions, runbooks.
- Dependencies: ownership and contract conventions.
- Deliverable: durable side-effect processing.
- Acceptance: duplicates safe, DLQ visible, broker recovery loses no committed intent.
- Verification: broker failure/restart and replay integration tests.

## Milestone 6 — NestJS gateway pilot

- Tasks: add gateway, define session/token verification, internal identity, tenant propagation and rate-limit policy; route a low-risk read.
- Files: `apps/api-gateway`, typed web client, deployment config.
- Dependencies: tenant hardening and contracts.
- Deliverable: first production-like gateway route.
- Acceptance: authorization/data parity, rollback possible, no direct domain DB access.
- Verification: integration/E2E and unauthorized request tests.

## Milestone 7 — First service extraction

- Tasks: select based on evidence (likely notifications/jobs or reporting), own data, migrate consumers/traffic, retain rollback.
- Files: one Nest service, schema/migrations, contracts and event consumers.
- Dependencies: milestones 5–6.
- Deliverable: independently deployed bounded capability.
- Acceptance: no cross-service DB access, independent release, tenant rules hold.
- Verification: contract, migration, failure, performance and restore tests.

## Milestone 8 — Selective CRM/Work/People extraction

- Tasks: extract only justified boundaries; projections/Sagas where needed; keep transaction-heavy proposal/invoice together until decomposition pays off.
- Dependencies: proven extraction pattern.
- Acceptance: failures have defined retry/status behavior and user workflows remain understandable.
- Verification: full workflow and tenant security suites.

## Milestone 9 — Production infrastructure

- Tasks: settle ALB/Nginx, managed PostgreSQL/RabbitMQ/secrets/storage, backup/restore, rollouts and autoscaling; evaluate K8s only when needed.
- Deliverable: repeatable AWS-ready operation.
- Acceptance: security review and restore drill meet RPO/RTO.
- Verification: staging load/failover/restore exercises.

## Milestone 10 — Billing, analytics, integrations

- Tasks: add subscription billing only if product scope requires it; mature projections/exports and provider retry/webhook/file retention.
- Acceptance: idempotent billing, tenant-scoped reports and auditable changes.
- Verification: provider sandbox, reconciliation, privacy/export checks.

## Done gate

For each authorized implementation slice: TypeScript, lint, build, unit/integration/E2E, cross-tenant security tests, mobile/dark/loading/empty/error states, migration rehearsal, logs/alerts, rollback/runbook and docs. No tests were run in this assessment phase.
