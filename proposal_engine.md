Perfect. Let's build **one complete real-world example** using **your exact business model** and the architecture we've agreed on.

---

# Step 1 — Master Data (Admin Creates Once)

## Service

```text
Website Development
```

---

## Package

```text
Business Website
```

Description

```text
Perfect for small and medium businesses looking for a professional online presence.
```

---

## Package Items (Pricing Template)

| Item                | Qty | Unit    | Unit Price | Billing  |
| ------------------- | --: | ------- | ---------: | -------- |
| Website Development |   1 | Project |    ₹45,000 | One Time |
| Domain (.com)       |   1 | Domain  |     ₹1,200 | Yearly   |
| Business Hosting    |   1 | Year    |     ₹5,000 | Yearly   |

This is only a **template**.

---

## Package Features

```text
✓ Responsive Design

✓ Admin Panel

✓ Contact Form

✓ SEO Friendly Structure

✓ Google Map Integration

✓ WhatsApp Chat

✓ SSL Configuration
```

---

## Terms Library

Website Terms

```text
• 50% Advance Payment

• Balance before Go Live

• Domain belongs to client

• Hosting renewed yearly

• 30 Days Free Support
```

---

# Step 2 — Customer Enquiry

Customer

```text
ABC Traders Pvt Ltd
```

Requirements

```text
Business Website

But

Already owns Domain

Needs Better Hosting

Needs Google Workspace
```

---

# Step 3 — Sales Creates Proposal

Sales selects

```text
Service

↓

Website Development

↓

Package

↓

Business Website
```

System loads template.

Initially

```text
Website Development

₹45,000

Domain

₹1,200

Hosting

₹5,000
```

---

# Step 4 — Sales Customizes

Customer already owns Domain.

Delete

```text
Domain
```

Customer wants Premium Hosting.

Edit

```text
Hosting

₹5,000

↓

₹8,000
```

Customer needs Google Workspace.

Add

```text
Google Workspace

Qty

10 Users

₹6,000

Yearly
```

Customer negotiated Website price.

```text
Website Development

₹45,000

↓

₹42,000
```

---

# Final Proposal

## Header

```text
Proposal Number

PR-2026-00001

Customer

ABC Traders Pvt Ltd

Prepared By

John

Status

Draft

Valid Until

30 July 2026
```

---

## Selected Service

```text
Website Development

Package

Business Website
```

---

## Proposal Line Items

| Item                | Qty | Unit    | Billing  | Unit Price |   Total |
| ------------------- | --: | ------- | -------- | ---------: | ------: |
| Website Development |   1 | Project | One Time |    ₹42,000 | ₹42,000 |
| Premium Hosting     |   1 | Year    | Yearly   |     ₹8,000 |  ₹8,000 |
| Google Workspace    |  10 | Users   | Yearly   |       ₹600 |  ₹6,000 |

Notice

No Domain.

Sales removed it.

---

## Proposal Features

```text
Responsive Design

Admin Panel

Contact Form

SEO Friendly Structure

Google Map Integration

WhatsApp Chat

SSL Configuration
```

Sales also adds one custom feature.

```text
Google Analytics Setup
```

Now features become

```text
Responsive Design

Admin Panel

Contact Form

SEO Friendly Structure

Google Map Integration

WhatsApp Chat

SSL Configuration

Google Analytics Setup
```

---

## Proposal Sections

Introduction

```text
Thank you for considering our services.

We are pleased to submit this proposal for your new business website.
```

---

Project Scope

```text
Design

Development

Testing

Deployment
```

---

Timeline

```text
20 Working Days
```

---

About Us

```text
Nimu Technology is a software company...
```

---

Thank You

```text
Looking forward to working with you.
```

---

## Proposal Terms

Copied from master.

Sales edits one line.

Original

```text
30 Days Free Support
```

Changed to

```text
60 Days Free Support
```

Now proposal terms are

```text
50% Advance Payment

Balance before Go Live

Hosting renewed yearly

Domain belongs to client

60 Days Free Support
```

Master terms remain unchanged.

---

## Totals

```text
One Time

Website Development

₹42,000

----------------------

Yearly

Premium Hosting

₹8,000

Google Workspace

₹6,000

----------------------

One Time Total

₹42,000

Yearly Total

₹14,000
```

---

# What is stored in the Proposal?

Only this.

```text
Proposal

│

├── Header

│

├── Services

│

├── Line Items

│

├── Features

│

├── Sections

│

├── Terms

│

└── Totals
```

Everything is copied.

---

# What happens tomorrow?

Admin edits package.

Business Website becomes

```text
Website Development

₹55,000

Hosting

₹9,000

Adds

Email Setup
```

Should this proposal change?

No.

Proposal still contains

```text
Website Development

₹42,000

Premium Hosting

₹8,000

Google Workspace

₹6,000
```

Exactly as it was when it was created.

---

# Then customer accepts

Now the proposal becomes the source for the next modules.

```text
Proposal

PR-2026-00001

│

├── Invoice
│
│     Website Development ₹42,000
│
│     Premium Hosting ₹8,000
│
│     Google Workspace ₹6,000
│

├── Renewals
│
│     Premium Hosting
│
│     Due in 1 Year
│
│     Google Workspace
│
│     Due in 1 Year
│

└── Project
      Website Development
```

Notice something important:

* **Website Development** becomes a **Project** because it's work to be delivered.
* **Premium Hosting** and **Google Workspace** do **not** become projects. They become **Renewals** because they have recurring billing.
* The invoice is generated from the proposal's own line items, not from your `ServicePackageItem` master records.

---

## This is the architecture I'd build for your CRM

```text
MASTER DATA (Admin)
────────────────────────────────

Service
└── Website Development

Package
└── Business Website

Package Items (Template)
├── Website Development
├── Domain
└── Hosting

Features (Template)
Terms (Template)

        │
        │ Copy Once
        ▼

PROPOSAL (Standalone Snapshot)
────────────────────────────────

Proposal Header

Proposal Service
└── Website Development

Proposal Line Items
├── Website Development (edited to ₹42,000)
├── Premium Hosting (edited to ₹8,000)
└── Google Workspace (custom item)

Proposal Features
Proposal Terms
Proposal Sections
Proposal Totals

        │
        ├── Invoice
        ├── Project(s)
        └── Renewal(s)
```

I think this matches your current package design, your goal of keeping proposals completely standalone, and the workflow of a real digital agency without introducing unnecessary complexity.

-x-

Awesome. I think we've finally converged on a design that's simple, flexible, and scalable.

Below is the **complete V1 proposal flow** from the moment an admin creates services to the moment a project, invoice, and renewal are generated.

---

# 1. Admin Setup (Master Data)

This is done once by the admin.

## Service

```text
Website Development
SEO
Google Ads
Hosting
AMC
Mobile App
```

No pricing here.

---

## Package

Example

```text
Website Development

├── Basic Website
├── Business Website
└── Ecommerce Website
```

---

## Package Items (Pricing Template)

Business Website

| Item                | Qty | Unit    | Unit Price | Billing  |
| ------------------- | --: | ------- | ---------: | -------- |
| Website Development |   1 | Project |    ₹45,000 | One Time |
| Domain (.com)       |   1 | Domain  |     ₹1,200 | Yearly   |
| Business Hosting    |   1 | Year    |     ₹5,000 | Yearly   |

These are **default quotation rows**.

Not final quotation.

---

## Package Features

```text
Responsive Design

Admin Panel

SEO Friendly

Contact Form

WhatsApp Integration

SSL Configuration
```

---

## Terms

Website Terms

```text
50% Advance

Balance before Go Live

Hosting Renewed Yearly

30 Days Support
```

---

# 2. Customer Enquiry

Customer

```text
ABC Group
```

Requirement

```text
Corporate Website

Franchise Website

SEO
```

---

# 3. Sales clicks "Create Proposal"

Proposal Header

```text
Proposal Number

PR-2026-00001

Customer

ABC Group

Title

Website Development Proposal

Prepared By

John

Valid Until

30 Days

Status

Draft
```

Proposal is empty.

---

# 4. Add First Proposal Service

Sales clicks

```text
+ Add Service
```

Select

```text
Website Development

↓

Business Website Package
```

System copies

* Package
* Package Items
* Features
* Terms

Creates

```text
Proposal Service #1
```

---

## Proposal Service #1

Display Name

```text
Corporate Website
```

Line Items

| Item                | Qty | Unit    | Unit Price | Billing  |
| ------------------- | --: | ------- | ---------: | -------- |
| Website Development |   1 | Project |    ₹45,000 | One Time |
| Domain              |   1 | Domain  |     ₹1,200 | Yearly   |
| Hosting             |   1 | Year    |     ₹5,000 | Yearly   |

Features

```text
Responsive

CMS

SEO Friendly

SSL
```

Terms

Website Terms

---

# 5. Sales Customizes

Customer says

Already owns Domain.

Delete

```text
Domain
```

Customer wants Premium Hosting.

Edit

```text
Hosting

₹5,000

↓

₹8,000
```

Customer wants Google Workspace.

Add

| Item             | Qty | Unit | Unit Price | Billing |
| ---------------- | --: | ---- | ---------: | ------- |
| Google Workspace |  10 | User |       ₹600 | Yearly  |

Customer negotiated Website.

Edit

```text
Website Development

₹45,000

↓

₹42,000
```

Everything is editable.

---

# Proposal Service #1 now becomes

| Item                | Qty | Billing  |   Price |
| ------------------- | --: | -------- | ------: |
| Website Development |   1 | One Time | ₹42,000 |
| Premium Hosting     |   1 | Yearly   |  ₹8,000 |
| Google Workspace    |  10 | Yearly   |  ₹6,000 |

---

# 6. Add Second Proposal Service

Customer also wants

```text
Franchise Website
```

Sales clicks

```text
+ Add Service
```

Again selects

```text
Website Development

↓

Business Website
```

System copies everything again.

Creates

```text
Proposal Service #2
```

Sales renames

```text
Franchise Website
```

Edits

| Item                | Qty | Billing  |   Price |
| ------------------- | --: | -------- | ------: |
| Website Development |   1 | One Time | ₹35,000 |
| Hosting             |   1 | Yearly   |  ₹5,000 |

---

# 7. Add Third Proposal Service

Customer wants SEO.

Sales selects

```text
SEO

↓

Premium Package
```

Creates

```text
Proposal Service #3
```

Items

| Item        | Qty | Billing |   Price |
| ----------- | --: | ------- | ------: |
| Monthly SEO |   1 | Monthly | ₹18,000 |

---

# 8. Proposal Sections

Default

```text
Introduction

About Us

Project Scope

Timeline

Pricing

Terms

Thank You
```

Sales edits using Tiptap.

---

# 9. Proposal Totals

The system automatically calculates.

## One Time

| Item              |  Amount |
| ----------------- | ------: |
| Corporate Website | ₹42,000 |
| Franchise Website | ₹35,000 |

Total

```text
₹77,000
```

---

## Monthly

SEO

```text
₹18,000
```

---

## Yearly

Hosting

```text
₹13,000
```

Google Workspace

```text
₹6,000
```

Total

```text
₹19,000
```

---

# 10. Preview

Sales previews PDF.

Everything can still be edited.

---

# 11. Save Draft

This is the important step.

Proposal stores

```text
Proposal

↓

Proposal Services

↓

Proposal Line Items

↓

Proposal Features

↓

Proposal Terms

↓

Sections

↓

Totals
```

Nothing references

```text
Service

Package

Package Item

Package Feature

Terms
```

anymore.

Proposal becomes standalone.

---

# 12. Send Proposal

Customer receives PDF.

Status

```text
Sent
```

---

# 13. Customer Requests Changes

Sales edits proposal.

Save.

Still Version 1 (for V1).

Later we can add versioning.

---

# 14. Customer Accepts

Status

```text
Accepted
```

Proposal becomes locked.

No more editing.

---

# 15. Invoice Generation

Invoice is created from Proposal Line Items.

```text
Invoice

Website Development

₹42,000

Franchise Website

₹35,000

Hosting

₹13,000

Google Workspace

₹6,000

SEO

₹18,000
```

No master tables involved.

---

# 16. Renewal Generation

System checks billing cycle.

```text
Hosting

Yearly

↓

Renewal
```

```text
Google Workspace

Yearly

↓

Renewal
```

```text
SEO

Monthly

↓

Renewal
```

Website Development

One Time

↓

No Renewal.

---

# 17. Project Generation

Now the admin chooses which proposal services require execution.

Create

```text
Corporate Website Project
```

Create

```text
Franchise Website Project
```

SEO can be:

* a separate project, or
* ongoing recurring work depending on your business process.

Hosting and Google Workspace usually do **not** become projects because they're service deliveries, not development work.

---

# Final Database Architecture

```text
MASTER DATA
────────────────────────────────

Service

Package

Package Items

Package Features

Terms

            │

            │ Copy Once

            ▼

PROPOSAL
────────────────────────────────

Proposal
│
├── Proposal Services
│      │
│      ├── Corporate Website
│      ├── Franchise Website
│      └── SEO
│
├── Proposal Line Items
│
├── Proposal Features
│
├── Proposal Terms
│
├── Proposal Sections
│
└── Proposal Totals

            │

            ▼

Invoice

Renewals

Projects
```

---

# V1 Modules to Build (in order)

### Phase 1

* Proposal Header
* Proposal Number Generator
* Proposal Status

### Phase 2

* Proposal Service (multiple services per proposal)
* Add / Duplicate / Remove Proposal Service

### Phase 3

* Proposal Line Items
* Edit quantity
* Edit price
* Edit billing cycle
* Add custom items
* Delete items

### Phase 4

* Proposal Features
* Copy from package
* Add/remove/edit features

### Phase 5

* Proposal Terms
* Auto-copy from selected services
* Editable

### Phase 6

* Proposal Sections
* Rich text editor
* Introduction
* Scope
* Timeline
* Thank You

### Phase 7

* Automatic Totals
* One-time total
* Monthly total
* Quarterly total
* Half-yearly total
* Yearly total

### Phase 8

* Preview

### Phase 9

* PDF Generation

### Phase 10

* Status Workflow
* Draft → Sent → Accepted → Rejected → Expired

### Phase 11 (Future)

* Versioning
* Email History
* Activity Timeline

---

## One final recommendation

Keep one rule throughout the implementation:

> **The proposal is the source of truth after it is created.**

Everything after acceptance—invoice generation, renewal generation, project creation, reporting, and auditing—should read from the proposal snapshot, never from `Service`, `ServicePackage`, `ServicePackageItem`, `PackageFeature`, or `ProposalTerm`.

If you stick to that rule, you'll avoid most of the historical consistency problems that CRM systems run into. I think this is a solid foundation for the rest of your platform.

# CRM Proposal Engine V1 - Final Architecture & Implementation Plan

# Core Principle

The proposal is a completely standalone business document.

After a proposal is created, it must never depend on:

* Service
* Service Package
* Service Package Item
* Package Feature
* Terms Library

These tables are used only while creating the proposal.

Once copied, the proposal owns its own data.

---

# Master Data (Already Completed)

These are reusable templates managed by Admin.

Customer

↓

Service

↓

Service Package

↓

Package Items (Pricing Template)

↓

Package Features

↓

Terms Library

Sales never edits these while creating a proposal.

---

# Proposal Creation Flow

Customer Enquiry

↓

Create Proposal

↓

Fill Proposal Header

↓

Add Blocks

↓

Preview

↓

Save Draft

↓

Send

↓

Accepted

↓

Invoice

↓

Project

↓

Renewals

---

# Proposal Structure

Proposal

├── Header
│
├── Block
│
├── Block
│
├── Block
│
├── Block
│
└── Activity

Everything inside a proposal is a Block.

---

# Supported Block Types

## SECTION

Free rich text.

Examples

* Introduction
* About Us
* Why Choose Us
* Project Understanding
* Timeline
* Client Responsibilities
* Thank You

Sales can

* Create
* Edit
* Delete
* Duplicate
* Reorder

---

## SERVICE

Represents one offering inside the proposal.

Examples

Corporate Website

Franchise Website

SEO

Google Ads

Hosting

One proposal can contain any number of SERVICE blocks.

Example

Proposal

├── Corporate Website
├── Franchise Website
├── SEO
└── Google Ads

Each SERVICE block is completely independent.

---

## PRICING_SUMMARY

System generated.

Automatically calculates totals from every Proposal Line Item.

Shows

* One Time Total
* Monthly Total
* Quarterly Total
* Half Yearly Total
* Yearly Total
* Grand Total

Read-only.

---

## TERMS

System generated.

When a SERVICE block is added:

Service

↓

Terms Library

↓

Copy Terms

↓

Proposal Terms

Sales can edit the copied terms.

Master Terms never change.

---

# SERVICE Block Structure

Corporate Website

│

├── Display Name

├── Package Name

├── Description

├── Proposal Line Items

├── Features

└── Notes

Everything inside the block is editable.

---

# Proposal Line Items

Copied from Package Items.

Example

Website Development

₹45,000

Hosting

₹5,000

Domain

₹1,200

After copying

Sales can

* Change Quantity
* Change Unit
* Change Unit Price
* Change Billing Cycle
* Add New Item
* Delete Existing Item
* Reorder Items

Example

Website Development

₹42,000

Premium Hosting

₹8,000

Google Workspace

₹6,000

The master package is never modified.

---

# Features

Copied from Package Features.

Sales can

* Add Feature
* Remove Feature
* Edit Feature
* Reorder Feature

Example

✓ Responsive Design

✓ Admin Panel

✓ SEO Friendly

✓ SSL

✓ Google Analytics

These features belong only to this SERVICE block.

---

# Block Reordering

Every block has a Sort Order.

Sales can drag and drop.

Example

Introduction

↓

Corporate Website

↓

Timeline

↓

Franchise Website

↓

SEO

↓

Pricing Summary

↓

Terms

↓

Thank You

No restrictions.

Everything is block-based.

---

# Complete Proposal Example

Proposal

Introduction

↓

About Us

↓

Corporate Website

```
Website Development

Premium Hosting

Google Workspace
```

↓

Timeline

↓

Franchise Website

```
Website Development

Hosting
```

↓

SEO

```
Monthly SEO
```

↓

Pricing Summary

↓

Terms

↓

Thank You

---

# New Database Tables

Proposal

Stores

* Proposal Number
* Customer Snapshot
* Prepared By
* Status
* Valid Until
* Currency
* Totals

---

ProposalBlock

Represents every block inside the proposal.

Supported Types

* SECTION
* SERVICE
* PRICING_SUMMARY
* TERMS

Stores

* Block Type
* Sort Order

For SECTION

* Title
* Rich Text Content

For SERVICE

* Display Name
* Package Name
* Description
* Features (JSON)
* Notes

For TERMS

* Rich Text Content

For PRICING_SUMMARY

No editable content.

---

ProposalLineItem

Belongs to a SERVICE block.

Stores

* Item Name
* Description
* Quantity
* Unit
* Unit Price
* Billing Cycle
* Total

Fully editable.

No references to ServicePackageItem.

---

ProposalActivity

Simple audit log.

Examples

Created

Edited

Sent

Accepted

Rejected

Expired

---

# UI Flow

New Proposal

↓

Select Customer

↓

Fill Header

↓

Save Draft

↓

* Add Section

↓

* Add Service

↓

Choose Service

↓

Choose Package

↓

System copies

* Package Items
* Package Features
* Terms

↓

Creates SERVICE Block

↓

Sales edits

* Line Items
* Features
* Notes

↓

Repeat for more services

↓

Pricing Summary updates automatically

↓

Terms update automatically

↓

Drag & Drop Blocks

↓

Preview

↓

Generate PDF

↓

Send

↓

Accepted

↓

Invoice

↓

Project

↓

Renewals

---

# Invoice Generation

Invoice reads only from

Proposal Line Items

Never from

Service Package Items

---

# Renewal Generation

Proposal Line Item

↓

Billing Cycle

↓

Generate Renewal

Recurring items only.

---

# Project Generation

Each SERVICE block can become a project.

Example

Corporate Website

↓

Corporate Website Project

Franchise Website

↓

Franchise Website Project

SEO

↓

SEO Project (optional depending on workflow)

---

# Final Rule

Master Data is used only during proposal creation.

After Save Draft

Everything becomes standalone.

Proposal is the single source of truth.

Nothing inside the proposal depends on the master tables anymore.
