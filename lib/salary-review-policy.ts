export interface SalaryReviewDetails {
  status: string;
  approvedAt?: Date | string | null;
  medicalReimbursement?: unknown;
  extraEarnings?: unknown;
  extraDeductions?: unknown;
  adjustments?: ReadonlyArray<{
    id?: string;
    removedAt?: Date | string | null;
  }>;
}

export function hasManualSalaryAdjustments(slip: SalaryReviewDetails) {
  return (
    Number(slip.medicalReimbursement ?? 0) > 0 ||
    Number(slip.extraEarnings ?? 0) > 0 ||
    Number(slip.extraDeductions ?? 0) > 0 ||
    (slip.adjustments ?? []).some((adjustment) => !adjustment.removedAt)
  );
}

export function requiresSalarySlipReview(slip: SalaryReviewDetails) {
  return (
    slip.status === "GENERATED" &&
    !slip.approvedAt &&
    hasManualSalaryAdjustments(slip)
  );
}
