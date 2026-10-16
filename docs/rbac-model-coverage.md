# RBAC Model Coverage

`lib/permissions.ts` defines the Better Auth access-control statements and the
`prismaModelPermissions` map. The map is typed against `Prisma.ModelName`, so
adding a Prisma model without assigning an RBAC resource fails TypeScript.
`tests/rbac-model-coverage.test.ts` verifies resource validity and sensitive
role boundaries.

| RBAC resource | Prisma models covered |
| --- | --- |
| `users` / Better Auth `user`, `session` | `User`, `Session`, `Account`, `Verification` |
| `customers` | `Customer`, `CustomerContact` |
| `services` | `Service`, `ServicePackage`, `ServicePackageItem`, `PackageFeature` |
| `terms` | `ProposalTerm`, `ProposalTermPackage` |
| `proposals` | `ProposalTemplate`, `Proposal`, `ProposalBlock`, `ProposalService`, `ProposalLineItem`, `ProposalFeature`, `ProposalActivity` |
| `company`, `bankAccounts` | `Company`, `CompanyBankAccount` |
| `tariffs` | `TariffGrid`, `TariffGridPackage` |
| `invoices` | `Invoice`, `InvoiceLineItem`, `InvoicePayment`, `InvoiceActivity` |
| `finance` | `FinancialAccount`, `ExpenseCategory`, `Expense` |
| `referenceData` | `ExchangeRateCache`, `Country`, `State` |
| `attendance` | `AttendanceRecord`, `AttendanceBreak`, `AttendanceSettings`, `AttendanceAuditLog` |
| `leave`, `holidays` | `LeaveRequest`, `Holiday` |
| `salary` | `SalaryStructure`, `SalarySlip` |

Staff receive leave self-service, holiday read access, and read-only reference
data. Salary access is limited to Admin, Super Admin, and HR-department staff;
ordinary staff cannot access the salary page or salary actions. HR staff use the
existing department checks for manager access because Better Auth roles do not
distinguish HR from other staff. Attendance actions check the attendance
resource, then retain their own-record or HR/Admin/Super Admin scope checks.
Company and bank-account administration remain Super Admin-only; invoices and
proposals use their own resource permissions when reading associated company
or bank details. Tariff pages and actions are limited to Admin and Super Admin.

Authentication-owned `Account`, `Verification`, and `Session` records are
managed by Better Auth. Public proposal links use their existing unguessable
link capability and are not equivalent to authenticated dashboard access.
