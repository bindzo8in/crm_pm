export interface SalaryEmployee {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string | null;
  hasSalaryStructure: boolean;
  designation?: string | null;
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

export type SalarySlipStatus = "DRAFT" | "GENERATED" | "PAID";

export interface SalarySlipRecord {
  id: string;
  userId: string;
  month: number;
  year: number;
  status: SalarySlipStatus;
  totalDays: number;
  paidDays: number;
  absentDays: number;
  netSalary: number | string;
  medicalReimbursement: number | string;
  extraEarnings: number | string;
  extraDeductions: number | string;
  user?: Pick<SalaryEmployee, "name" | "email" | "department"> | null;
}

export type SalarySlipUpdate = Pick<SalarySlipRecord, "id" | "status"> &
  Partial<Omit<SalarySlipRecord, "id" | "status">>;
