const WORKED_ATTENDANCE_STATUSES = new Set(["PRESENT", "LATE", "HALF_DAY"]);

export function isAttendanceInProgress(record: {
  status: string;
  clockIn?: Date | string | null;
  clockOut?: Date | string | null;
  isAutoCheckedOut?: boolean;
  isSynthetic?: boolean;
}) {
  return (
    WORKED_ATTENDANCE_STATUSES.has(record.status) &&
    Boolean(record.clockIn) &&
    !record.clockOut &&
    !record.isAutoCheckedOut &&
    !record.isSynthetic
  );
}
