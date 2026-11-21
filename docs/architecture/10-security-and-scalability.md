# Security, Operations, and Scalability

## Security requirements

- Verify session/service identity, organization membership, permissions and record scope in each action/API/service. Validate inputs with Zod server-side.
- Enforce tenant predicates plus PostgreSQL RLS and composite tenant foreign keys.
- Keep Better Auth secure cookies, origin/CSRF checks and verification. Review rate limits, session lifetime, reset/invitation abuse, OAuth linking, MFA recovery and revocation.
- Use least-privilege DB/service credentials, managed secrets, rotation, TLS, encrypted storage/backups and PII-redacted logs.
- Rate-limit by IP at edge and by user/tenant at app layer. Use idempotency/replay protection on jobs/webhooks.
- Authorize tenant/resource before issuing upload/download URLs; store provider object ID with URL where applicable.
- Audit role changes, tenant lifecycle, exports, proposals, invoices/payments and payroll. Apply retention/append-only policy to security audit.
- Apply OWASP practices: output encoding, safe file validation, SSRF controls, parameterized SQL, CORS allowlists and secure headers.

## Operations and visibility

Structured logs should include request/correlation ID, tenant ID, actor ID, route, result and latency, while redacting customer/payroll payloads. Add OpenTelemetry across gateway/services/broker when introduced. Expose liveness/readiness without leaking secrets. Track latency/error rates, DB pool use, queue age/DLQ, provider failures and tenant rate pressure.

Define backup encryption, RPO/RTO, restore drills, migration recovery and tenant export. Use timeouts and bounded retries for providers; do not retry unsafe writes without idempotency. Source review cannot confirm production proxy/TLS, RLS status, access-log redaction, alerts or restore drills; validate these operationally.

## Scaling sequence

1. Measure query plans, endpoint latency and pool pressure.
2. Optimize tenant indexes, pagination, N+1 queries and reports.
3. Move long work to an outbox-backed worker.
4. Scale stateless web/gateway replicas behind ALB; externalize WebSocket fanout if multi-instance needs require it.
5. Add read projections when report load competes with transactional writes.
6. Extract services only for proven release, scaling or security boundaries.
7. Adopt Kubernetes when deployment complexity warrants the cost.
