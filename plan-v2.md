I'd update the roadmap slightly. The biggest gap in the original plan is that **Proposal Templates** and **Terms Library** should exist **before** the Proposal Builder. Otherwise you'll end up rebuilding every proposal manually.

I'd also treat **Package Features** and **Terms** as template data that gets copied into a proposal, not referenced directly.

---

# Updated Development Roadmap

## ✅ Completed

### Foundation

* [x] Next.js Setup
* [x] Prisma
* [x] Better Auth
* [x] RBAC
* [x] Dashboard Layout
* [x] Sidebar
* [x] Navigation

### User Management

* [x] Users
* [x] Roles
* [x] Departments

### Customer Module

* [x] Customer CRUD
* [x] Customer Details
* [x] Search

Pending

* [ ] Customer Contacts
* [ ] Customer Filters

### Service Module

* [x] Services
* [x] Packages
* [x] Package Features
* [x] Billing Cycles
* [x] Permissions
* [x] Search
* [x] CRUD
* [x] Forms
* [x] Tables

---

# Phase 4 — Proposal Foundation

Before building proposals, create all reusable libraries.

## 4.1 Terms & Conditions Management

Purpose

Reusable Terms Library.

Features

* CRUD
* Rich Text Editor (Tiptap)
* Categories
* Service Mapping
* Package Mapping (Optional)
* Default Terms
* Active / Inactive
* Sort Order

Example

```text
Payment Terms

↓

Website Development Terms

↓

SEO Terms

↓

Hosting Terms

↓

AMC Terms
```

---

## 4.2 Proposal Templates

Purpose

Reusable proposal structure.

Example

```text
Website Proposal

Introduction

About Company

Scope

Timeline

Pricing

Terms
```

Features

* CRUD
* Rich Text Sections
* Default Sections
* Default Terms
* Default Pricing Layout

---

## 4.3 Rich Text Editor

Reusable editor used everywhere.

Technology

* Tiptap Core
* Custom Toolbar
* Shadcn UI
* React 19
* Next.js 16

Used in

* Proposal Sections
* Proposal Templates
* Terms
* Internal Notes
* Customer Notes
* Future Project Descriptions

---

# Phase 5 — Proposal Engine

This becomes the largest module.

---

## Database

```text
Proposal

↓

Proposal Version

↓

Proposal Sections

↓

Proposal Pricing

↓

Proposal Terms

↓

Proposal Activity
```

---

## Proposal Features

### Proposal CRUD

* Draft
* Sent
* Revision Requested
* Accepted
* Rejected
* Expired

---

### Proposal Versioning

```text
Proposal

↓

Version 1

↓

Version 2

↓

Version 3

↓

Accepted Version
```

Only accepted version becomes immutable.

---

### Proposal Builder

Steps

```text
Customer

↓

Proposal Details

↓

Choose Template

↓

Choose Services

↓

Choose Packages

↓

Generate Sections

↓

Generate Terms

↓

Pricing

↓

Preview

↓

Save Draft
```

---

### Rich Text Sections

Each section editable.

Examples

* Introduction
* About Client
* Scope
* Deliverables
* Timeline
* Notes

---

### Pricing Builder

NOT a Rich Text Table.

Dedicated pricing component.

Each row supports

* Service
* Description
* Quantity
* Unit Price
* Discount
* Tax
* Billing Cycle
* Total

Sales can modify prices.

---

### Terms & Conditions

Automatically generated.

Workflow

```text
Selected Packages

↓

Find Related Terms

↓

Copy Into Proposal

↓

Sales Edits

↓

Save
```

Proposal stores copied terms.

Never reference the library directly.

---

### Proposal PDF

Generated from Proposal Version.

Never from live database records.

---

### Proposal Activity

Timeline

```text
Proposal Created

↓

Edited

↓

Sent

↓

Viewed

↓

Revision Requested

↓

Accepted

↓

Invoice Created
```

---

### Proposal Status History

Tracks every status change.

---

### Proposal Email

* Send PDF
* Email History
* Resend
* Download PDF

---

# Phase 6 — Invoice Module

Features

* Invoice CRUD
* Manual Invoice
* From Proposal
* Partial Payments
* Payment Tracking
* Invoice PDF

Statuses

```text
DRAFT

SENT

PARTIAL

PAID

OVERDUE

CANCELLED
```

---

# Phase 7 — Renewal Module

Automatically generated from recurring proposal items.

Supports

* Hosting
* Domain
* SEO
* AMC
* Maintenance

Reminder Schedule

* 30 Days
* 15 Days
* 7 Days
* Due Today

---

# Phase 8 — Project Module

Project Sources

```text
Accepted Proposal

or

Direct Customer Project

or

Internal Project
```

Features

* Team Members
* Attachments
* Comments
* Progress
* Activity Timeline

---

# Phase 9 — Task Module

Features

* CRUD
* Assignment
* Due Dates
* Comments
* Attachments
* Priority
* Status
* Activity

---

# Phase 10 — Reports

CRM

* Revenue
* Proposals
* Conversion Rate
* Pending Invoices
* Renewals

Projects

* Active Projects
* Team Workload
* Overdue Tasks

Employees

* Assigned Tasks
* Completed Tasks
* Active Projects

---

# Notifications

Database Notifications

* Proposal Created
* Proposal Sent
* Proposal Accepted
* Invoice Due
* Renewal Due
* Task Assigned

Web Push Notifications

* Proposal
* Invoice
* Renewal
* Tasks

---

# Final Build Order

```text
Authentication
        ↓
Users & Roles
        ↓
Customers
        ↓
Services
        ↓
Packages
        ↓
Package Features
        ↓
Terms & Conditions Library
        ↓
Proposal Templates
        ↓
Rich Text Editor
        ↓
Proposal Engine
        ↓
Invoice Engine
        ↓
Renewal Engine
        ↓
Projects
        ↓
Tasks
        ↓
Reports
        ↓
Notifications
```

## One additional recommendation

I would introduce a small but important distinction in your data model:

* **Library Modules** (Services, Package Features, Terms Library, Proposal Templates) are reusable master data managed by admins.
* **Transactional Modules** (Proposals, Invoices, Projects, Tasks) should always **copy** relevant library data at creation time instead of referencing it directly. This preserves historical accuracy when master data changes later, which is essential for proposals, invoices, and legal documents.
