export interface SalaryEmployee {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string | null;
  hasSalaryStructure: boolean;
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
