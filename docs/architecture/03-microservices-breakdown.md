# Service and Module Boundaries

## Service decisions

The source repo is not currently microservices. These are logical ownership boundaries; initially they can be modules in one deployable app and transitional database. Eventual separate services must own their data.

| Capability | Ownership and recommendation |
|---|---|
| Identity & Tenant Access | Keep Better Auth Admin and Organization plugins in one service. It owns users/accounts/sessions/verification/OAuth and organizations/members/invitations/org roles/teams. Admin plugin roles are platform-wide user administration; Organization plugin roles are scoped to an organization. Split tenant lifecycle into a separate service only if it becomes independently operated; keep Better Auth identity and its plugin-owned membership data together unless deliberately replacing that model. |
| CRM Core | Customer/contact, catalog, proposals, invoices, company, payments and finance. One context initially; do not split tightly coupled snapshots/transactions. |
| Work | Projects, tasks, comments, chat, activity and attachment metadata. Cohesive module; extract when collaboration scale warrants. |
| People | Employee lifecycle, attendance, leave, holidays, salary/payroll. Logical boundary for confidentiality; decide tenant semantics before extraction. |
| Notifications/Jobs | Notification delivery, push, reminders and email. Attractive future worker boundary after outbox/broker. |
| Reporting | Existing aggregate reports. Start read-only module; future projections fed by events. |
| Files | Cloudinary metadata/upload policy. Shared capability now; separate only when retention, scanning or scale requires. |
| Audit | Keep domain activity/history with source aggregate. Add central append-only security audit stream; avoid generic history service prematurely. |
| Billing | Existing customer invoices are not SaaS subscription billing. New capability only if CRM plans/subscriptions are in scope. |

## Competitor capability map

The screenshots are a competitor-reference scope. “Gap” means no equivalent first-class model/module was identified, not a commitment to build it.

| Capability | Existing foundation / gap | If approved, logical owner |
|---|---|---|
| Leads | No first-class Lead entity/pipeline found; telecalling prototype is not a lead service. | CRM Core; define qualification, dedupe and conversion to contact/account. |
| Contacts | CustomerContact exists but is customer-bound. | CRM Core; consider a general party/contact model only after migration analysis. |
| Accounts | Tenant company profile/customer company name, not account hierarchy. | CRM Core; distinguish tenant Company from buyer Account. |
| Deals/Forecasts | Proposals/reports exist; no opportunity stages, probability or forecast snapshots. | CRM Core; forecast read model later. Proposal is not synonymous with Deal. |
| Documents | Proposal/invoice PDFs and uploads exist. | Shared file capability; metadata/ACL belongs to owning record. |
| Campaigns | No campaign domain identified. | CRM Core marketing module until independent service need. |
| Activities (tasks, meetings, calls, visits) | Project tasks exist; meeting/call/visit logs not found. | Work/Activity module; link to lead/contact/deal with tenant scope. |
| Products/price books/quotes | Products, services, tariffs and proposal pricing exist. | CRM Core; validate tariffs against price-book requirements. |
| Sales Orders | Invoices exist, no order/fulfilment model. | CRM Core initially; define accepted proposal → order → invoice. |
| Purchase Orders/Vendors | Expenses exist, no procurement lifecycle. | New Procurement module only if product-approved; separate supplier workflows from sales accounts. |
| Cases/Solutions | Internal issue reports, not customer support cases/knowledge. | Support module if support CRM is in scope. |
| SalesInbox/social | Transactional email exists, no sales sync/social activity. | Communication/integration capability; define provider, consent, ownership and dedupe. |
| Services/Projects | Existing service catalog and projects/tasks. | Current CRM Core and Work modules. |

These are modules first, not one microservice per menu entry. Extract only when data ownership and operating needs support it.

## Future API/data/event sketches

| Service | Owned data | API examples | Events | Auth/communication |
|---|---|---|---|---|
| Identity & Tenant Access | Better Auth auth tables; Organization, Member, Invitation, OrganizationRole, Team, TeamMember | Better Auth routes; tenant administration APIs such as `GET /v1/organizations/{id}/members` | `OrganizationCreated`, `MemberInvited`, `MemberRemoved` | Admin plugin handles platform-level user administration; Organization plugin handles org-scoped membership/permissions. Services validate user identity and tenant context. |
| CRM Core | Customer/contact, catalog, proposal, invoice, payment, company and domain activity | `/v1/customers`, `/v1/proposals`, `/v1/invoices` | `CustomerCreated`, `ProposalSent`, `ProposalAccepted`, `InvoiceIssued`, `PaymentRecorded` | Tenant + record policy; REST sync and RabbitMQ side effects. |
| Work | Projects/tasks/chat/activity | `/v1/projects`, `/v1/tasks`, `/v1/conversations` | `ProjectCreated`, `TaskAssigned`, `TaskCompleted` | Tenant + project membership/assignment policy. |
| People | Attendance, leave, holiday, payroll, employment | `/v1/attendance`, `/v1/leaves`, `/v1/payroll/slips` | `LeaveApproved`, `AttendanceRecorded`, `PayrollSlipApproved` | Highly restricted employee self/HR/admin permissions. |
| Notifications | Delivery attempts/preferences, optionally in-app notification ownership | Internal notification APIs | Consumes domain events; `NotificationDelivered/Failed` | Service credentials, tenant checks and idempotent consumers. |
| Analytics | Rebuildable tenant projections | `/v1/reports/*` | Consumes versioned domain events | Read-only scoped APIs; eventual consistency advertised. |
| Files (optional) | Upload metadata, ownership, retention/quarantine | Upload/download APIs | `FileUploaded`, `FileDeleted` | Resource authorization before short-lived URL. |
| Billing (future) | Subscription, plan, entitlement, webhook idempotency | `/v1/subscriptions`, `/v1/entitlements` | `SubscriptionChanged`, `TenantSuspended` | Platform-scoped administration; add only with product scope. |

These APIs/events are proposals, not existing implementations. Cross-service references use stable IDs and local projections; no shared table access. Use Saga only for truly distributed workflows.

## Organization vs CRM roles

Keep Better Auth `owner`, `admin`, `member` for organization administration. Existing HR, Finance and Sales Executive templates are domain permission bundles. Assign these within an organization and enforce record scope (`own`, `assigned`, `team`, `all`) in backend queries. A future Sales Manager role should only see team records when server-side team scope proves it. Do not overload `SUPER_ADMIN` or department to mean sales role.
