import type { EmploymentStatus, UserRole } from "@/app/generated/prisma/enums";

export interface SalaryEmployee {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  employmentStatus: EmploymentStatus;
  department: string | null;
  includeInPayroll: boolean;
  hasSalaryStructure: boolean;
  grossSalary: string | null;
  designation: string | null;
  dateOfJoining?: Date | string | null;
  employmentType?: "PERMANENT" | "CONTRACT" | "PROBATION" | "INTERN" | null;
  annualCtc?: string | null;
  bankName?: string | null;
  bankAccountNo?: string | null;
  bankIfsc?: string | null;
  bankAccountType?: "SAVINGS" | "CURRENT" | null;
  panNo?: string | null;
  aadhaarNo?: string | null;
  costCenter?: string | null;
  uanNo?: string | null;
  pfNo?: string | null;
  esiNo?: string | null;
  pfEligible?: boolean;
  esiEligible?: boolean;
  taxRegime?: "OLD" | "NEW";
  paymentMethod?: "BANK_TRANSFER" | "UPI" | "CHEQUE" | "CASH" | "OTHER";
}

export type SalarySlipStatus = "DRAFT" | "GENERATED" | "APPROVED" | "PAID";

export interface SalarySlipRecord {
  id: string;
  userId: string;
  month: number;
  year: number;
  status: SalarySlipStatus;
  approvedAt?: Date | string | null;
  totalDays: number;
  paidDays: number;
  absentDays: number;
  netSalary: number | string;
  medicalReimbursement: number | string;
  extraEarnings: number | string;
  extraDeductions: number | string;
  emailSentAt?: Date | string | null;
  adjustments?: SalarySlipAdjustmentRecord[];
  user?: Pick<SalaryEmployee, "name" | "email" | "department"> | null;
}

export interface SalarySlipPageInfo {
  page: number;
  pageSize: number;
  totalCount: number;
  paidYtd: string;
}

export interface SalaryRosterPageInfo {
  page: number;
  pageSize: number;
  totalCount: number;
}

export interface SalaryManagementSummary {
  activeCount: number;
  includedCount: number;
  excludedCount: number;
  configuredCount: number;
  latestMonth: number | null;
  latestYear: number | null;
  monthlyTotal: string;
  paidCount: number;
  slipCount: number;
}

export interface SalarySlipAdjustmentRecord {
  id: string;
  type: "EARNING" | "DEDUCTION";
  description: string;
  amount: number | string;
}

export type SalarySlipUpdate = Pick<SalarySlipRecord, "id"> &
  Partial<Omit<SalarySlipRecord, "id">>;
