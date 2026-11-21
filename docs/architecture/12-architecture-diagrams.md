# Architecture Diagrams

These diagrams distinguish source-observed state from a recommended future state.

## Existing

```mermaid
flowchart LR
  Browser --> Next[Next.js UI + actions + routes]
  Next --> BA[Better Auth]
  Next --> Prisma[Prisma Client]
  BA --> Prisma
  Prisma --> DB[(PostgreSQL: all domains)]
  Next --> Providers[Resend / Cloudinary / FX / Web Push]
  Scheduler --> Next
  Browser <-->|WebSocket on custom Node server| Next
```

## Proposed services

```mermaid
flowchart LR
  Browser --> Web[Next.js]
  Web --> Edge[ALB / optional Nginx]
  Edge --> Gateway[NestJS API Gateway]
  Gateway --> Identity[Better Auth / tenant policy]
  Gateway --> CRM[CRM Core]
  Gateway --> Work[Work]
  Gateway --> People[People Operations]
  CRM --> DB1[(CRM-owned DB)]
  Work --> DB2[(Work-owned DB)]
  People --> DB3[(People-owned DB)]
  CRM --> MQ[(RabbitMQ)]
  Work --> MQ
  People --> MQ
  MQ --> Notify[Notifications]
  MQ --> Analytics[Analytics projections]
```

## Infrastructure role flow

```mermaid
flowchart LR
  Client --> LB[Load balancer: healthy instance distribution]
  LB --> RP[Optional reverse proxy: edge HTTP policy]
  RP --> GW[API gateway: application routing/auth context]
  GW --> SD[Orchestrator service discovery]
  SD --> A[Domain service A]
  SD --> B[Domain service B]
  A --> Broker[Async message broker]
  Broker --> B
```

## Authentication/tenant request flow

```mermaid
sequenceDiagram
  participant U as User
  participant W as Web/Gateway
  participant BA as Better Auth
  participant P as Policy
  participant S as Domain service
  participant DB as Tenant DB
  U->>W: Request + session + selected org
  W->>BA: Validate session
  BA-->>W: Principal
  W->>P: Confirm membership and permission
  P-->>W: Canonical tenant context
  W->>S: Validated request + context
  S->>S: Check resource scope and invariants
  S->>DB: Tenant predicate + RLS transaction
  DB-->>S: Scoped result
  S-->>W: Result
  W-->>U: Response
```

## Customer creation event flow

```mermaid
sequenceDiagram
  participant UI as Next.js
  participant CRM as CRM Core
  participant DB as PostgreSQL
  participant MQ as RabbitMQ
  participant N as Notifications
  participant A as Analytics
  UI->>CRM: Create customer/lead
  CRM->>DB: Aggregate + outbox in one transaction
  DB-->>CRM: Commit
  CRM-->>UI: Created
  DB->>MQ: Publish crm.customer.created.v1
  MQ->>N: Consume and notify
  MQ->>A: Consume and update projection
```

## Future AWS deployment

```mermaid
flowchart TB
  Internet --> ALB[Public ALB]
  ALB --> Net[Private app network]
  Net --> Web[Next.js tasks]
  Net --> Gateway[NestJS gateway]
  Net --> CRM[CRM service]
  Net --> Worker[Worker tasks]
  CRM --> CRMDB[(CRM database)]
  Worker --> MQ[(Managed RabbitMQ)]
  CRM --> MQ
  Net --> Secrets[Managed secrets]
  CRM --> Storage[Cloudinary / object storage]
  Web --> Obs[Logs / traces / metrics]
  Gateway --> Obs
  Worker --> Obs
```

Initially retain the current single app/database and Docker/Compose. K8s and independent services are later choices, not prerequisites.
