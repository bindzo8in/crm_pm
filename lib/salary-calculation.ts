export interface SalaryCalculationInput {
  grossBase: number;
  totalDaysInMonth: number;
  presentDays: number;
  halfDays: number;
  absentDays: number;
  chargeableLeaveDays: number;
  allowedPaidLeaves?: number;
  customEarnings?: number;
  fixedDeductions?: number;
  customDeductions?: number;
}

export function calculateMonthlySalary(input: SalaryCalculationInput) {
  const allowedPaidLeaves = input.allowedPaidLeaves ?? 1;
  const paidLeaveConsumed = Math.min(
    allowedPaidLeaves,
    Math.max(0, input.chargeableLeaveDays),
  );
  const unpaidLeaves = Math.max(0, input.chargeableLeaveDays - paidLeaveConsumed);
  const lopDays =
    input.absentDays + input.halfDays * 0.5 + unpaidLeaves;
  const paidDays = Math.max(0, input.totalDaysInMonth - lopDays);
  const perDayGross = input.grossBase / input.totalDaysInMonth;
  const absentDeduction = lopDays * perDayGross;
  const customEarnings = input.customEarnings ?? 0;
  const fixedDeductions = input.fixedDeductions ?? 0;
  const customDeductions = input.customDeductions ?? 0;
  const totalEarnings = input.grossBase - absentDeduction + customEarnings;
  const totalDeductions = fixedDeductions + customDeductions;

  return {
    paidLeaveConsumed,
    unpaidLeaves,
    lopDays,
    paidDays,
    perDayGross,
    absentDeduction,
    totalEarnings,
    totalDeductions,
    netSalary: totalEarnings - totalDeductions,
  };
}

export function countWorkingDays(start: Date, end: Date, holidays: ReadonlySet<string>) {
  let count = 0;
  const cursor = new Date(Date.UTC(
    start.getUTCFullYear(),
    start.getUTCMonth(),
    start.getUTCDate(),
  ));
  const finalDate = new Date(Date.UTC(
    end.getUTCFullYear(),
    end.getUTCMonth(),
    end.getUTCDate(),
  ));

  while (cursor <= finalDate) {
    const weekday = cursor.getUTCDay();
    const key = cursor.toISOString().slice(0, 10);
    if (weekday !== 0 && weekday !== 6 && !holidays.has(key)) {
      count++;
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return count;
}
