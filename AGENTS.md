<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# This is NOT the Next.js you know

This project uses the latest Next.js version and may contain APIs, conventions, and patterns that differ from your training data.

Before generating code:

1. Read the relevant documentation inside:
   `node_modules/next/dist/docs/`

2. Check for:

   * Breaking changes
   * Deprecated APIs
   * New conventions
   * Updated routing patterns
   * Server Actions behavior
   * Cache & revalidation changes

3. Never assume an API still works because it existed in older Next.js versions.

4. Prefer official Next.js recommendations over legacy patterns.

5. If unsure, inspect the project's existing codebase and follow the established pattern.

<!-- END:nextjs-agent-rules -->

# Project Standards

## General Rules

* Follow existing project architecture.
* Reuse existing components before creating new ones.
* Reuse existing utilities before creating new helpers.
* Reuse existing repositories before writing database queries.
* Reuse existing validation schemas before creating new schemas.
* Avoid duplicate logic.

---

# Code Quality

## TypeScript

* Strict TypeScript only.
* No `any`.
* No `@ts-ignore`.
* No unnecessary type assertions.
* Prefer inferred types when clear.
* Export reusable types.

Bad:

```ts
const data: any = response;
```

Good:

```ts
const data: CustomerResponse = response;
```

---

## Functions

* Keep functions small.
* Single responsibility.
* Extract reusable business logic.

Avoid:

```ts
500+ line functions
```

Preferred:

```ts
service
repository
validation
action
```

separated clearly.

---

# Architecture

## Layer Responsibilities

### UI Layer

Responsibilities:

* Rendering
* User interaction
* Form handling

Must NOT:

* Access database directly
* Contain business logic

---

### Server Actions

Responsibilities:

* Input validation
* Authorization
* Service orchestration

Must NOT:

* Contain raw Prisma queries

---

### Repository Layer

Responsibilities:

* Database operations
* Query optimization

Must NOT:

* Contain UI logic
* Contain business logic

---

### Validation Layer

Use:

* Zod

Validate:

* Forms
* Server actions
* API inputs

Never trust client data.

---

# Database Rules

## Prisma

* Use Prisma transactions when modifying multiple tables.
* Prevent N+1 queries.
* Select only required fields.
* Prefer pagination.
* Use indexes on searchable columns.

Avoid:

```ts
include: {
  everything: true
}
```

Fetch only required data.

---

# CRM Domain Rules

## Customers

Customer data must never be deleted permanently.

Use:

```ts
isActive
```

or

```ts
deletedAt
```

Soft delete only.

---

## Proposals

Rules:

* Proposals are immutable once sent.
* Sent proposals must create new versions.
* Never overwrite historical proposal versions.

Example:

```text
PRO-001-V1
PRO-001-V2
PRO-001-V3
```

---

## Pricing

Store:

```ts
basePrice
quotedPrice
```

Never overwrite original package pricing.

---

## Invoices

Invoices must remain immutable after being marked paid.

Use adjustment records instead of editing paid invoices.

---

# Security

## Authentication

Always verify:

```ts
session
role
permissions
```

inside server actions.

Never trust client role checks.

---

## Authorization

Every protected action must validate:

```ts
isAuthenticated
isAuthorized
```

before execution.

---

## Input Validation

All inputs must be validated with Zod.

No exceptions.

---

# UI Standards

## Components

Prefer:

```text
components/features/*
```

for domain components.

Prefer:

```text
components/ui/*
```

for reusable UI.

---

## Forms

Use:

* React Hook Form
* Zod Resolver

Avoid uncontrolled complex forms.

---

## Tables

Use:

* TanStack Table

Requirements:

* Pagination
* Sorting
* Filtering

for all large datasets.

---

# State Management

Preferred order:

1. URL State
2. Server State (TanStack Query)
3. Local State (useState)

Avoid global state unless necessary.

---

# Data Fetching

Prefer:

* Server Components
* Server Actions

Use TanStack Query when:

* Pagination
* Infinite loading
* Realtime refresh
* Complex caching

---

# File Uploads

Use Cloudinary.

Store:

```ts
url
publicId
```

Never store Cloudinary URLs alone.

---

# Notifications

Use:

* Database notifications
* Web Push notifications

Design notifications as extensible.

Future integrations:

* Email
* WhatsApp

must be possible without schema redesign.

---

# Performance

Requirements:

* Cursor pagination for large tables.
* Debounced search.
* Optimized database queries.
* Avoid unnecessary client components.
* Prefer Server Components where possible.

---

# Logging

Log:

* Proposal created
* Proposal sent
* Proposal accepted
* Invoice created
* Payment recorded

Use activity logs for auditing.

---

# Testing Checklist

Before completing any feature:

* TypeScript passes
* ESLint passes
* Build passes
* No console errors
* Mobile responsive
* Dark mode compatible
* Loading states present
* Empty states present
* Error states present

---

# Deliverables

When implementing features:

1. Update Prisma schema if needed.
2. Update Zod schemas.
3. Update repositories.
4. Update server actions.
5. Update UI.
6. Handle loading state.
7. Handle error state.
8. Handle empty state.
9. Ensure TypeScript passes.
10. Ensure production build passes.

Never deliver partially connected features.
