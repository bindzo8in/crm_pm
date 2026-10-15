# Project Context: Income and Expense Manager

This report summarizes the current CRM codebase for an AI assistant that will help design and implement an income/expense management feature. It describes the existing app and finance-adjacent functionality; it is not a specification for all desired product behavior.

## 1. Product and application overview

- This is a private business CRM built with Next.js App Router.
- Existing business modules include customers, services/packages, proposals, invoices, company settings, attendance, leave management, and employee salary management.
- The authenticated application is primarily under `app/dashboard/`. Public-facing proposal and invoice pages are under `app/p/` and `app/i/`.
- The current dashboard page renders generic cards, a chart, and static local table data. It is not yet a financial dashboard connected to invoice or payroll totals.
- No general-purpose income, expense, ledger, or transaction model/page was found. Existing invoice payments and salary slips are related data, but they are not currently unified as finance transactions.

## 2. Technology and project conventions

- Next.js `16.2.10`, React `19.2.4`, TypeScript, and Tailwind CSS 4.
- PostgreSQL via Prisma `7.x` and `@prisma/adapter-pg`. Prisma schema: [`prisma/schema.prisma`](./prisma/schema.prisma); generated client output: `app/generated/prisma`.
- Zod `4.x` is used to validate action inputs and form data.
- Better Auth handles sessions, user roles, and permissions.
- The UI uses shared components under `components/ui/`, dashboard shell/navigation components, React Hook Form, TanStack Query/Table, and Recharts in the existing dashboard.
- Package scripts include `pnpm dev`, `pnpm build` (runs `prisma generate` then `next build`), and `pnpm lint`.
- Environment variables are validated in [`lib/env.ts`](./lib/env.ts). Do not put secret values in code or this context report.

## 3. Existing finance-related data and behavior

### Invoices and customer payments

- `Invoice` stores customer and creator relations, invoice dates/status, currency and exchange rate, totals, amount paid, optional company bank account, line items, payment rows, and activity history.
- Invoice statuses: `DRAFT`, `SENT`, `PARTIALLY_PAID`, `PAID`, `OVERDUE`, `VOID`.
- `InvoicePayment` stores the invoice, amount, method, date, reference ID, notes, and creation date. Payment methods include bank transfer, UPI, credit/debit card, cheque, cash, and other.
- [`actions/invoice.ts`](./actions/invoice.ts) validates with [`lib/schemas/invoice-schema.ts`](./lib/schemas/invoice-schema.ts), checks session and invoice permissions, records payment rows, updates the invoice amount/status, and writes invoice activity. Payment insertion and invoice update are performed in a Prisma transaction.
- Paid invoices are treated as immutable for edits and status changes. Preserve this behavior; do not rewrite historical invoice amounts to implement reporting.
- Invoices have soft-delete support through `deletedAt`.
- Invoice payments currently do **not** store an explicit company bank account/financial account or create a general ledger transaction.

### Salary and payroll

- `SalaryStructure` stores the current employee salary components and deductions.
- `SalarySlip` stores a monthly payroll snapshot, attendance-derived amounts, net salary, status (`DRAFT`, `GENERATED`, `PAID`), and optional payment date/method/reference/notes.
- A unique constraint prevents duplicate slips for one employee/month/year.
- [`actions/salary.ts`](./actions/salary.ts) handles salary structure, slip generation, and access checks. Admins/Super Admins and HR staff can manage payroll; employees can view their own salary information.
- A salary slip is a payroll record, not an expense ledger entry. Marking it paid currently does not create a general expense or link to a company bank account.

### Company bank accounts

- `CompanyBankAccount` is attached to `Company` and stores account details, UPI/QR information, default/active flags, and display order.
- [`actions/bank-accounts.ts`](./actions/bank-accounts.ts) and [`lib/schemas/bank-account.ts`](./lib/schemas/bank-account.ts) manage the settings.
- Bank accounts are configuration/payment destination data used by proposals/invoices; the model does not track balances or account transactions.
- Avoid copying bank account identifiers or other sensitive financial data into logs, reports, or client-visible output unnecessarily.

## 4. Authentication, authorization, and route patterns

- Dashboard pages commonly call `requirePageAccess()` from [`lib/auth-guard.ts`](./lib/auth-guard.ts), which checks the session and applies [`lib/route-permissions.ts`](./lib/route-permissions.ts).
- Permissions are defined in [`lib/permissions.ts`](./lib/permissions.ts). The existing permission statements include invoices, reports, settings, and other CRM areas, but there is no dedicated finance/expenses permission yet.
- Server actions must independently authenticate and authorize each operation; hiding a UI control or protecting only the page is not enough.
- Invoice actions use Better Auth permission checks such as `invoices:read` and `invoices:record-payment`. Payroll actions use their own role/department and self-access rules.
- If the new feature has restricted visibility or editing, define the roles/permissions and guard both routes and actions explicitly. Do not assume every signed-in role may see sensitive finance data.

## 5. Useful files and integration points

| Area | Files |
|---|---|
| Database schema | [`prisma/schema.prisma`](./prisma/schema.prisma), [`prisma/migrations/`](./prisma/migrations/) |
| Prisma client and DB config | [`lib/prisma.ts`](./lib/prisma.ts), [`prisma.config.ts`](./prisma.config.ts) |
| Invoice/payment behavior | [`actions/invoice.ts`](./actions/invoice.ts), [`lib/schemas/invoice-schema.ts`](./lib/schemas/invoice-schema.ts), `app/dashboard/invoices/`, `components/invoice/` |
| Payroll behavior | [`actions/salary.ts`](./actions/salary.ts), [`lib/schemas/salary-schema.ts`](./lib/schemas/salary-schema.ts), `app/dashboard/salary/`, `components/salary/` |
| Company bank settings | [`actions/bank-accounts.ts`](./actions/bank-accounts.ts), [`lib/schemas/bank-account.ts`](./lib/schemas/bank-account.ts), `app/dashboard/settings/business/banks/` |
| Dashboard shell/navigation | [`app/dashboard/page.tsx`](./app/dashboard/page.tsx), [`components/app-sidebar.tsx`](./components/app-sidebar.tsx), `app/dashboard/dashboard-container.tsx` |
| Authorization | [`lib/auth-guard.ts`](./lib/auth-guard.ts), [`lib/route-permissions.ts`](./lib/route-permissions.ts), [`lib/permissions.ts`](./lib/permissions.ts) |
| Project instructions | [`AGENTS.md`](./AGENTS.md) |

The sidebar currently has Invoice, Salary, and an Analytics placeholder, but no Income/Expense entry. The dashboard root currently imports static `app/dashboard/data.json`; a financial summary would need real server-side data fetching.

## 6. Implementation guidance for the new module

1. Inspect the full existing Prisma schema and invoice/payroll flows before choosing whether to link, aggregate, or separately record transactions.
2. Keep invoice, invoice-payment, and salary-slip history intact. Define explicitly whether a recorded invoice payment or paid salary slip should also create a corresponding finance transaction, and how to prevent duplicate totals if the same facts appear in both sources.
3. Choose and document the desired financial concepts before coding: income vs. expense, categories, account/cash source, transaction date, amount/currency, payment method, reference/notes, optional customer/vendor/employee association, status, and attachments/receipts if required.
4. Use decimal monetary columns (not floating point) and establish how reports handle invoice currencies/exchange rates and rounding. Existing invoices have currency and exchange-rate fields; salary amounts are stored as decimal values.
5. Use Prisma migrations and Zod validation. Use Prisma transactions for multi-row changes. Add database indexes for common date/category/account/status filters and paginate transaction lists.
6. Protect each page and server action with session and permission checks. Design permissions specifically for finance instead of relying on incidental invoice/settings access.
7. Integrate through the dashboard shell/sidebar, and make financial summary cards/charts load from real data with loading, empty, and error states.
8. Follow `AGENTS.md`: strict TypeScript (no `any` or `@ts-ignore`), soft-delete customer/domain data where appropriate, avoid editing paid invoice history, record activity where finance operations require auditability, and keep DB/business logic out of UI components.

Architecture note: existing invoice, salary, and bank-account server actions currently call Prisma directly. The project standards say Server Actions should validate/authorize/orchestrate and should not contain raw Prisma queries. For new work, follow those standards and use or introduce an appropriate service/repository layer rather than copying the existing direct-query pattern.

## 7. Product decisions still needed

The repository does not establish answers to these questions. Confirm them with the product owner before making assumptions:

- Should income be manually entered, derived from invoice payments, or support both?
- Should salary payments automatically count as expenses, and should other expenses link to invoices or payroll?
- Are transfers between accounts, opening balances, cash accounts, recurring entries, refunds, and partial payments in scope?
- Which roles may view, create, edit, delete, approve, or export financial records?
- Which currencies and tax/reporting rules should be supported?
- Which date ranges, categories, account filters, dashboard KPIs, exports, and audit/history requirements are expected?
- Should records be deleted, archived, or reversed with adjustment entries? Existing CRM guidance favors preserving financial history, and paid invoices are immutable.

## 8. Suggested instruction to the implementation AI

> Build an income and expense manager inside this existing CRM. First inspect the project instructions and the finance-related models/actions listed in the context. Do not duplicate invoice payments or payroll amounts in reports. Ask for clarification on unresolved product decisions when they change data modeling or accounting behavior. Implement the agreed data model, Zod validation, authorization, database operations, dashboard routes/components, and real summary queries end-to-end. Preserve invoice/payroll history, use decimal amounts, and validate with the focused tests/lint/type/build commands available in the repository.
