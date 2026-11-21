# Monorepo Structure

## Tool

If separate Next/Nest apps become real, use **Nx** for project graph, Nest generators and affected workflows. Turborepo is lighter if only task pipelines are needed. Keep the current pnpm repository until migration provides concrete CI/dependency benefits.

## Future layout

```text
apps/
  web/                         # Next.js UI, Server Components, API client
  api-gateway/                 # NestJS request boundary
  identity/                    # Only if Better Auth boundary is independently operated
  crm-core/                    # Customer/catalog/proposal/invoice
  work/                        # Projects/tasks/collaboration
  people/                      # Attendance/leave/payroll
  notifications/               # Workers and delivery adapters
libs/
  contracts/                   # Versioned DTOs/events and client types
  auth-client/                 # Session/token verification interfaces
  config/                      # Validated config primitives
  observability/               # Logging/tracing/metrics interfaces
  testing/                     # Shared test builders, not shared business mocks
  ui/                           # Reusable UI primitives
infra/
  compose/ docker/ aws/         # K8s only when operationally justified
docs/architecture/
```

## Ownership rules

Share stable API/event schemas, error envelopes, correlation context, telemetry interfaces, validated config primitives and neutral UI. Keep Prisma schema, migrations, repositories, tenant policy, business authorization and write models inside the owner service. Do not create a shared “database” library enabling every app to query all tables. Use explicit versioned DTOs rather than coupling to another service's entities.

First modularize current actions behind application services; add Nest gateway and contracts later. Move one bounded module with its own schema and migration only after its contract is proven. Maintain pnpm.
