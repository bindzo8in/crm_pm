# Agency CRM & Project Management Platform

## Product Vision

A single-company internal platform to manage:

* Customers
* Proposals
* Invoices
* Renewals
* Projects
* Tasks
* Employees
* Reports

The platform is divided into two major modules:

### CRM Module

Handled by:

* Sales Team
* Admin

Responsible for:

* Customer Management
* Proposal Management
* Invoice Management
* Payment Tracking
* Renewal Tracking

---

### Project Management Module

Handled by:

* Admin
* Developers
* Designers
* SEO Team
* Marketing Team

Responsible for:

* Projects
* Tasks
* Comments
* Attachments
* Project Delivery

---

# User Structure

## Roles

```text
SUPER_ADMIN
ADMIN
STAFF
```

Roles control permissions.

---

## Departments

```text
SALES
DEVELOPMENT
DESIGN
SEO
MARKETING
HR
OPERATIONS
```

Departments are organizational only.

---

## Designation

Examples:

* Sales Executive
* Senior Developer
* Junior Developer
* SEO Executive
* HR Manager

Designation is display only.

---

# CRM Workflow

Customer
↓
Proposal
↓
Proposal Revisions
↓
Accepted
↓
Invoice (Optional)
↓
Project Creation (Manual)

---

# Project Workflow

Customer
↓
Project
↓
Tasks
↓
Execution
↓
Review
↓
Completed

Projects may also be created:

* Without Proposal
* Without Invoice
* Internal Projects

---

# Customer Module

Customer

Fields:

* Customer Number
* Display Name
* Company Name
* Primary Contact
* Additional Contacts
* Website
* Address
* Billing Address
* Industry
* Notes

Relationships:

Customer
├── Contacts
├── Proposals
├── Invoices
├── Projects
└── Renewals

---

# Proposal Module

Proposal
├── Version 1
├── Version 2
├── Version 3
└── Accepted Version

Status:

* DRAFT
* SENT
* REVISION_REQUESTED
* ACCEPTED
* REJECTED
* EXPIRED

Features:

* Rich Text Sections
* Pricing Table
* Terms & Conditions
* PDF Generation
* Version History
* Proposal Templates

---

# Services & Packages

Service

Examples:

* Website Development
* SEO
* Google Ads
* Hosting
* Domain
* AMC

Each Service contains Packages.

Example:

SEO
├── Basic
├── Standard
└── Premium

Sales can customize pricing.

---

# Pricing Structure

Each Proposal Item supports:

* Name
* Description
* Quantity
* Unit Price
* Discount

Billing Cycle:

* ONE_TIME
* MONTHLY
* QUARTERLY
* YEARLY

Example:

Website Development
₹50,000
ONE_TIME

Hosting
₹5,000
YEARLY

Domain
₹1,200
YEARLY

---

# Invoice Module

Invoices are manual.

Can be created:

1. From Proposal
2. Directly

Status:

* DRAFT
* SENT
* PARTIAL
* PAID
* OVERDUE
* CANCELLED

Payments:

* Advance
* Partial
* Balance

No payment gateway integration.

---

# Renewal Module

Tracks recurring items:

* Hosting
* Domain
* SEO
* AMC
* Maintenance

Generated from billing cycle.

Reminder Types:

* 30 Days
* 15 Days
* 7 Days
* Due Today

---

# Project Module

Project Sources:

* Accepted Proposal
* Direct Customer Work
* Internal Work

Status:

* PLANNING
* IN_PROGRESS
* REVIEW
* ON_HOLD
* COMPLETED
* CANCELLED

Supports:

* Multiple Team Members
* Attachments
* Comments
* Progress Tracking

---

# Task Module

Task belongs to Project.

Status:

* TODO
* IN_PROGRESS
* REVIEW
* COMPLETED
* CANCELLED

Priority:

* LOW
* MEDIUM
* HIGH
* URGENT

Features:

* Assignment
* Comments
* Attachments
* Due Date

---

# Notifications

Database Notifications

Examples:

* Proposal Accepted
* Proposal Rejected
* Invoice Due
* Renewal Due
* Task Assigned

Web Push Notifications

* Proposal Events
* Renewal Events
* Task Events

---

# Reports

CRM Reports

* Proposals Sent
* Accepted Proposals
* Rejected Proposals
* Revenue
* Pending Invoices
* Renewals

Project Reports

* Active Projects
* Overdue Tasks
* Team Workload
* Completed Projects

Employee Reports

* Assigned Tasks
* Completed Tasks
* Active Projects

---

# V1 Scope

Included:

✔ Authentication
✔ Users
✔ Departments
✔ Customers
X Industries (for now we remove this)
✔ Services
✔ Packages
✔ Proposal Builder
✔ Proposal PDF
✔ Proposal Versioning
✔ Invoice Management
✔ Renewal Tracking
✔ Projects
✔ Tasks
✔ Notifications
✔ Reports

Excluded:

✘ Customer Portal
✘ Group Chat
✘ Payroll
✘ Attendance
✘ Leave Management
✘ WhatsApp Integration
✘ Multi Company Support
✘ Payment Gateway

# Development Roadmap (8–10 Weeks)

## Week 1 — Foundation

### Day 1

* Setup Project
* Prisma
* Better Auth
* RBAC

### Day 2

* User Schema
* Department Schema
* Industry Schema

### Day 3

* User CRUD
* User Table
* Role Management

### Day 4

* Industry CRUD

### Day 5

* Dashboard Layout
* Sidebar
* Navigation

### Checklist

* [X] Auth
* [X] Roles
* [X] Users
* [X] Departments
* [] Industries (for now we remove this)

---

## Week 2 — Customer Module

### Day 1

* Customer Schema

### Day 2

* Customer Form

### Day 3

* Customer Table

### Day 4

* Customer Details Page

### Day 5

* Customer Contacts

### Checklist

* [X] Customer CRUD
* [ ] Customer Contacts
* [X] Search
* [ ] Filters

---

## Week 3 — Service & Package Module

### Day 1

* Service Schema

### Day 2

* Package Schema

### Day 3

* Service Form

### Day 4

* Package Builder

### Day 5

* Testing

### Checklist

* [ ] Services
* [ ] Packages
* [ ] Billing Cycles

---

## Week 4–5 — Proposal Engine

### Build

* Proposal Schema
* Proposal Versions
* Proposal Builder
* Rich Text Sections
* Terms
* PDF Engine
* Templates

### Checklist

* [ ] Proposal CRUD
* [ ] Versioning
* [ ] PDF Export
* [ ] Templates

---

## Week 6 — Invoice Module

### Build

* Invoice Schema
* Payments
* Invoice PDF

### Checklist

* [ ] Invoice CRUD
* [ ] Payment Tracking
* [ ] Status Management

---

## Week 7 — Renewals

### Build

* Renewal Engine
* Reminder Logic

### Checklist

* [ ] Renewals
* [ ] Notifications

---

## Week 8 — Projects

### Build

* Project Schema
* Project CRUD
* Team Assignment

### Checklist

* [ ] Projects
* [ ] Team Members

---

## Week 9 — Tasks

### Build

* Task CRUD
* Comments
* Attachments

### Checklist

* [ ] Tasks
* [ ] Comments
* [ ] Attachments

---

## Week 10 — Reports & QA

### Build

* Dashboard Reports
* Activity Logs
* Notifications
* Final Testing

### Checklist

* [ ] Reports
* [ ] Notifications
* [ ] QA
* [ ] Production Ready

# Critical Rule

Build in this order:

```text
Users
→ Customers
→ Services
→ Packages
→ Proposal Engine
→ Invoice Engine
→ Renewals
→ Projects
→ Tasks
→ Reports
```

Do **not** start Projects before the Proposal Engine is finished. The Proposal Engine is the most complex and highest-value module in the entire system.
