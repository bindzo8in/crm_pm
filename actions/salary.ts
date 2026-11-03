"use server";

import prisma from "@/lib/prisma";
import { calculateMonthlySalary, countWorkingDays } from "@/lib/salary-calculation";
import { auth } from "@/lib/auth";
import { UserRole } from "@/app/generated/prisma/enums";
import { headers } from "next/headers";
import { env } from "@/lib/env";
import {
  saveSalaryStructureSchema,
  generateSalarySlipSchema,
  updateSalarySlipStatusSchema,
  autoGenerateMonthlySalarySlipsSchema,
  updateSalarySlipAdjustmentsSchema,
  salarySlipAdjustmentRemovalSchema,
  approveSalarySlipSchema,
  sendSalarySlipEmailSchema,
  salaryComponentsSchema,
  salaryPayrollInclusionSchema,
  salarySlipsQuerySchema,
} from "@/lib/schemas/salary-schema";
import { revalidatePath } from "next/cache";
import { isSalaryPinSessionValid } from "@/lib/salary-pin";
import { sendSalarySlipPdfEmail } from "@/lib/email";

type SalaryActor = NonNullable<
  Awaited<ReturnType<typeof auth.api.getSession>>
>["user"];
type SalaryPermission =
  | "read-own"
  | "read-all"
  | "create"
  | "update"
  | "mark-paid";

async function hasSalaryPermission(permission: SalaryPermission) {
  const result = await auth.api.userHasPermission({
    headers: await headers(),
    body: { permissions: { salary: [permission] } },
  });
  return result.success;
}

async function canPerformSalaryPermission(
  user: SalaryActor,
  permission: SalaryPermission,
) {
  if (user.role === UserRole.STAFF && user.department === "HR") {
    return true;
  }
  return hasSalaryPermission(permission);
}

function hasSalaryCronAuthorization(requestHeaders: Headers) {
  const configuredSecret = env.SALARY_CRON_SECRET;
  return Boolean(
    configuredSecret &&
      requestHeaders.get("authorization") === `Bearer ${configuredSecret}`
  );
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unexpected error.";
}

async function emailAutomaticallyGeneratedSalarySlip(slipId: string) {
  const slip = await prisma.salarySlip.findUnique({
    where: { id: slipId },
    select: {
      id: true,
      month: true,
      year: true,
      status: true,
      approvedAt: true,
      emailSentAt: true,
      user: { select: { name: true, email: true } },
    },
  });
  if (!slip) throw new Error("Generated salary slip could not be found.");
  if (slip.status !== "GENERATED") {
    throw new Error("Only newly generated, unapproved slips can be emailed automatically.");
  }
  if (slip.approvedAt) {
    throw new Error("Approved slips must be emailed manually.");
  }
  if (slip.emailSentAt) return;
  if (!slip.user.email) {
    throw new Error(`Employee ${slip.user.name} does not have an email address.`);
  }
  if (!env.SALARY_CRON_SECRET) {
    throw new Error("SALARY_CRON_SECRET is not configured for automatic slip delivery.");
  }

  const pdfUrl = new URL(
    `/api/salary/slips/${encodeURIComponent(slip.id)}/pdf`,
    env.NEXT_PUBLIC_SITE_URL,
  );
  const pdfResponse = await fetch(pdfUrl, {
    headers: {
      authorization: `Bearer ${env.SALARY_CRON_SECRET}`,
      "X-Tunnel-Skip-AntiPhishing-Page": "true",
    },
    cache: "no-store",
  });
  if (!pdfResponse.ok || !pdfResponse.headers.get("content-type")?.includes("application/pdf")) {
    throw new Error(`Could not generate the salary slip PDF (HTTP ${pdfResponse.status}).`);
  }

  const monthName = new Date(Date.UTC(slip.year, slip.month - 1, 1)).toLocaleString("en", {
    month: "long",
    timeZone: "UTC",
  });
  await sendSalarySlipPdfEmail({
    email: slip.user.email,
    employeeName: slip.user.name,
    monthName,
    year: slip.year,
    pdf: Buffer.from(await pdfResponse.arrayBuffer()),
  });

  const emailSentAt = new Date();
  const result = await prisma.salarySlip.updateMany({
    where: { id: slip.id, status: "GENERATED", emailSentAt: null },
    data: { emailSentAt },
  });
  if (result.count !== 1) {
    throw new Error("Email was sent, but its delivery record could not be saved.");
  }
}

async function getAuthenticatedUser() {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({ headers: reqHeaders });
  if (!session || !session.user) {
    throw new Error("Unauthorized");
  }
  if (
    session.user.role === UserRole.STAFF &&
    !session.user.department?.trim()
  ) {
    throw new Error(
      "Ask your administrator or HR manager to assign you to a department before using salary tools.",
    );
  }
  return { session };
}

export async function getSalaryStructureAction(userId: string) {
  try {
    const { session } = await getAuthenticatedUser();
    
    // Only HR or Admin can view other's salary, users can view their own
    const isSelf = session.user.id === userId;
    const isHrOrAdmin = 
      session.user.role === UserRole.SUPER_ADMIN || 
      session.user.role === UserRole.ADMIN || 
      (session.user.role === UserRole.STAFF && session.user.department === 'HR');

    if (!isSelf && !isHrOrAdmin) {
      return { success: false, error: "Unauthorized access to salary details." };
    }
    if (!(await canPerformSalaryPermission(session.user, isSelf ? "read-own" : "read-all"))) {
      return { success: false, error: "Unauthorized access to salary details." };
    }
    if (isHrOrAdmin && !(await isSalaryPinSessionValid(session.user.id))) {
      return { success: false, error: "Unlock Salary Management with your PIN to continue." };
    }

    const structure = await prisma.salaryStructure.findUnique({
      where: { userId },
    });

    return { success: true, structure: structure ? JSON.parse(JSON.stringify(structure)) : null };
  } catch (error) {
    console.error("Error fetching salary structure:", error);
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function saveSalaryStructureAction(input: unknown) {
  try {
    const { session } = await getAuthenticatedUser();
    
    // Only HR or Admin can edit salary structure
    const isHrOrAdmin = 
      session.user.role === UserRole.SUPER_ADMIN || 
      session.user.role === UserRole.ADMIN || 
      (session.user.role === UserRole.STAFF && session.user.department === 'HR');

    if (!isHrOrAdmin) {
      return { success: false, error: "Only Admins and HR can update salary structures." };
    }
    if (!(await canPerformSalaryPermission(session.user, "update"))) {
      return { success: false, error: "Only Admins and HR can update salary structures." };
    }
    if (!(await isSalaryPinSessionValid(session.user.id))) {
      return { success: false, error: "Unlock Salary Management with your PIN to continue." };
    }

    const parsed = saveSalaryStructureSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: "Invalid salary structure.", details: parsed.error.issues };
    }
    const validated = parsed.data;

    const employee = await prisma.user.findUnique({
      where: { id: validated.userId },
      select: { id: true },
    });
    if (!employee) {
      return { success: false, error: "The selected employee does not exist." };
    }

    const structure = await prisma.salaryStructure.upsert({
      where: { userId: validated.userId },
      update: {
        basicSalary: validated.basicSalary,
        hra: validated.hra,
        conveyance: validated.conveyance,
        medical: validated.medical,
        specialAllowance: validated.specialAllowance,
        providentFund: validated.providentFund,
        professionalTax: validated.professionalTax,
        tds: validated.tds,
        ...(validated.customComponents !== undefined
          ? { customComponents: validated.customComponents }
          : {}),
      },
      create: {
        userId: validated.userId,
        basicSalary: validated.basicSalary,
        hra: validated.hra,
        conveyance: validated.conveyance,
        medical: validated.medical,
        specialAllowance: validated.specialAllowance,
        providentFund: validated.providentFund,
        professionalTax: validated.professionalTax,
        tds: validated.tds,
        customComponents: validated.customComponents || [],
      },
    });

    return { success: true, structure: JSON.parse(JSON.stringify(structure)) };
  } catch (error) {
    console.error("Error saving salary structure:", error);
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function setSalaryPayrollInclusionAction(input: unknown) {
  try {
    const { session } = await getAuthenticatedUser();
    const isHrOrAdmin =
      session.user.role === UserRole.SUPER_ADMIN ||
      session.user.role === UserRole.ADMIN ||
      (session.user.role === UserRole.STAFF && session.user.department === "HR");

    if (
      !isHrOrAdmin ||
      !(await canPerformSalaryPermission(session.user, "update"))
    ) {
      return { success: false, error: "Only Admins and HR can manage payroll inclusion." };
    }
    if (!(await isSalaryPinSessionValid(session.user.id))) {
      return { success: false, error: "Unlock Salary Management with your PIN to continue." };
    }

    const parsed = salaryPayrollInclusionSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: "Invalid payroll inclusion setting.", details: parsed.error.issues };
    }

    const employee = await prisma.user.findUnique({
      where: { id: parsed.data.userId },
      select: { id: true, employmentStatus: true },
    });
    if (!employee) {
      return { success: false, error: "The selected employee does not exist." };
    }
    if (parsed.data.includeInPayroll && employee.employmentStatus !== "ACTIVE") {
      return { success: false, error: "Only active employees can be included in payroll." };
    }

    await prisma.user.update({
      where: { id: employee.id },
      data: { includeInPayroll: parsed.data.includeInPayroll },
    });
    revalidatePath("/dashboard/salary");
    return {
      success: true,
      message: parsed.data.includeInPayroll
        ? "Employee included in payroll."
        : "Employee excluded from future payroll.",
    };
  } catch (error) {
    console.error("Error updating payroll inclusion:", error);
    return { success: false, error: getErrorMessage(error) };
  }
}

function getDaysInMonth(month: number, year: number) {
  return new Date(year, month, 0).getDate();
}

export async function generateSalarySlipAction(input: unknown) {
  try {
    const requestHeaders = await headers();
    const session = await auth.api.getSession({ headers: requestHeaders });
    const isHrOrAdmin =
      session?.user.role === UserRole.SUPER_ADMIN ||
      session?.user.role === UserRole.ADMIN ||
      (session?.user.role === UserRole.STAFF && session.user.department === "HR");

    if (!isHrOrAdmin && !hasSalaryCronAuthorization(requestHeaders)) {
      return { success: false, error: "Only Admins and HR can generate salary slips." };
    }
    if (
      session?.user &&
      !(await canPerformSalaryPermission(session.user, "create"))
    ) {
      return { success: false, error: "Only Admins and HR can generate salary slips." };
    }
    if (
      isHrOrAdmin &&
      session?.user &&
      !(await isSalaryPinSessionValid(session.user.id))
    ) {
      return { success: false, error: "Unlock Salary Management with your PIN to continue." };
    }

    const parsed = generateSalarySlipSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: "Invalid salary slip input.", details: parsed.error.issues };
    }
    const validated = parsed.data;
    const { userId, month, year, medicalReimbursement, extraEarnings, extraDeductions } = validated;

    const payrollEmployee = await prisma.user.findFirst({
      where: { id: userId, includeInPayroll: true, employmentStatus: "ACTIVE" },
      select: { id: true },
    });
    if (!payrollEmployee) {
      return { success: false, error: "This employee is not included in active payroll." };
    }

    // Check if slip already exists
    const existing = await prisma.salarySlip.findUnique({
      where: {
        userId_month_year: { userId, month, year }
      }
    });

    if (existing && existing.status !== "DRAFT") {
      return { success: false, error: "Salary slip is already generated or paid." };
    }

    const structure = await prisma.salaryStructure.findUnique({
      where: { userId }
    });

    if (!structure) {
      return { success: false, error: "Salary structure not found for the user." };
    }

    const totalDaysInMonth = getDaysInMonth(month, year);
    
    // Fetch Attendance
    const startDate = new Date(Date.UTC(year, month - 1, 1));
    const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59));
    
    const attendances = await prisma.attendanceRecord.findMany({
      where: {
        userId,
        date: { gte: startDate, lte: endDate }
      }
    });
    const holidays = await prisma.holiday.findMany({
      where: { date: { gte: startDate, lte: endDate } },
      select: { date: true },
    });
    const holidayKeys = new Set(
      holidays.map((holiday) => holiday.date.toISOString().slice(0, 10)),
    );

    // We fetch Leave Requests that intersect with this month and are APPROVED
    const leaveRequests = await prisma.leaveRequest.findMany({
      where: {
        userId,
        status: "APPROVED",
        startDate: { lte: endDate },
        endDate: { gte: startDate }
      }
    });

    let presentDays = 0;
    let halfDays = 0;
    let absentDays = 0;
    let totalLeaveDaysTaken = 0;

    // Count Leaves taken in this month
    for (const leave of leaveRequests) {
      // clip leave to current month
      const start = leave.startDate < startDate ? startDate : leave.startDate;
      const end = leave.endDate > endDate ? endDate : leave.endDate;
      totalLeaveDaysTaken += countWorkingDays(start, end, holidayKeys);
    }

    for (const att of attendances) {
      if (att.status === "PRESENT" || att.status === "LATE") {
        presentDays++;
      } else if (att.status === "HALF_DAY") {
        halfDays++;
      } else if (att.status === "ABSENT") {
        absentDays++;
      }
    }

    // 1 permitted paid leave logic
    // Total absent-like days = absentDays + (halfDays * 0.5) + (if there are days missing entirely, but we'll assume they just didn't clock in so we must calculate unmarked days as absent unless they are weekends/holidays).
    // For simplicity, we assume: Unmarked days = totalDays - (present + halfDays + absent + totalLeaveDaysTaken) - weekends?
    // Let's compute based on LOP days explicitly.
    // Let's assume they must work all non-weekends, but we only have what's in attendance.
    // If a day is a leave, it's tracked in totalLeaveDaysTaken.
    // Let's calculate total days not worked:
    // Usually weekends are paid. Let's just consider absentDays, halfDays (0.5), and leaves.
    
    // Gross Salary Base
    const grossBase = 
      Number(structure.basicSalary) + 
      Number(structure.hra) + 
      Number(structure.conveyance) + 
      Number(structure.medical) + 
      Number(structure.specialAllowance);

    // Custom Components from structure
    const parsedCustomComponents = salaryComponentsSchema.safeParse(structure.customComponents ?? []);
    if (!parsedCustomComponents.success) {
      return { success: false, error: "Salary structure contains invalid custom components." };
    }
    const customComps = parsedCustomComponents.data;
    let customEarnings = extraEarnings + medicalReimbursement;
    let customDeductions = extraDeductions;

    customComps.forEach(comp => {
      if (comp.type === "EARNING") customEarnings += Number(comp.amount);
      if (comp.type === "DEDUCTION") customDeductions += Number(comp.amount);
    });

    const fixedDeductions = 
      Number(structure.providentFund) + 
      Number(structure.professionalTax) + 
      Number(structure.tds);
      
    const salary = calculateMonthlySalary({
      grossBase,
      totalDaysInMonth,
      presentDays,
      halfDays,
      absentDays,
      chargeableLeaveDays: totalLeaveDaysTaken,
      customEarnings,
      fixedDeductions,
      customDeductions,
    });

    const slipData = {
      userId,
      month,
      year,
      status: "GENERATED" as const,
      totalDays: totalDaysInMonth,
      paidDays: salary.paidDays,
      presentDays,
      absentDays: absentDays + salary.unpaidLeaves, // Combine them for visual simplicity
      leaveDays: totalLeaveDaysTaken,
      halfDays,
      
      basicSalary: structure.basicSalary,
      hra: structure.hra,
      conveyance: structure.conveyance,
      medical: structure.medical,
      specialAllowance: structure.specialAllowance,
      
      providentFund: structure.providentFund,
      professionalTax: structure.professionalTax,
      tds: structure.tds,
      
      absentDeduction: salary.absentDeduction,
      halfDayDeduction: 0, // already merged into absentDeduction via lopDays
      
      medicalReimbursement,
      extraEarnings,
      extraDeductions,
      customComponents: customComps,
      
      totalEarnings: salary.totalEarnings,
      totalDeductions: salary.totalDeductions,
      netSalary: salary.netSalary
    };

    let slip;
    if (existing) {
      slip = await prisma.salarySlip.update({
        where: { id: existing.id },
        data: slipData
      });
    } else {
      slip = await prisma.salarySlip.create({
        data: slipData
      });
    }

    return { success: true, slip: JSON.parse(JSON.stringify(slip)) };
  } catch (error) {
    console.error("Error generating salary slip:", error);
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function autoGenerateMonthlySalarySlipsAction(input: unknown) {
  try {
    const requestHeaders = await headers();
    const session = await auth.api.getSession({ headers: requestHeaders });
    const isHrOrAdmin =
      session?.user.role === UserRole.SUPER_ADMIN ||
      session?.user.role === UserRole.ADMIN ||
      (session?.user.role === UserRole.STAFF && session.user.department === "HR");

    if (!isHrOrAdmin && !hasSalaryCronAuthorization(requestHeaders)) {
      return { success: false, error: "Only Admins and HR can auto-generate salary slips." };
    }
    if (
      session?.user &&
      !(await canPerformSalaryPermission(session.user, "create"))
    ) {
      return { success: false, error: "Only Admins and HR can auto-generate salary slips." };
    }
    if (
      isHrOrAdmin &&
      session?.user &&
      !(await isSalaryPinSessionValid(session.user.id))
    ) {
      return { success: false, error: "Unlock Salary Management with your PIN to continue." };
    }

    const validated = autoGenerateMonthlySalarySlipsSchema.safeParse(input);
    if (!validated.success) {
      return { success: false, error: "Invalid month or year.", details: validated.error.issues };
    }
    const { month, year } = validated.data;

    const usersWithStructures = await prisma.user.findMany({
      where: {
        includeInPayroll: true,
        employmentStatus: "ACTIVE",
        salaryStructure: { isNot: null },
      },
      select: { id: true },
    });

    const results: Array<"generated" | "emailed" | "skipped" | "error"> = [];

    for (const user of usersWithStructures) {
      try {
        const existing = await prisma.salarySlip.findUnique({
          where: {
            userId_month_year: { userId: user.id, month, year },
          },
        });

        if (
          existing &&
          existing.scheduledGeneration &&
          existing.status === "GENERATED" &&
          !existing.approvedAt &&
          !existing.emailSentAt
        ) {
          await emailAutomaticallyGeneratedSalarySlip(existing.id);
          results.push("emailed");
          continue;
        }

        if (existing && existing.status !== "DRAFT") {
          results.push("skipped");
          continue;
        }

        const res = await generateSalarySlipAction({
          userId: user.id,
          month,
          year,
          medicalReimbursement: 0,
          extraEarnings: 0,
          extraDeductions: 0,
        });

        if (res.success) {
          const generatedSlip = await prisma.salarySlip.findUnique({
            where: { userId_month_year: { userId: user.id, month, year } },
            select: { id: true },
          });
          if (!generatedSlip) {
            throw new Error("Generated salary slip could not be reloaded.");
          }
          const markedScheduled = await prisma.salarySlip.updateMany({
            where: { id: generatedSlip.id, status: "GENERATED" },
            data: { scheduledGeneration: true },
          });
          if (markedScheduled.count !== 1) {
            throw new Error("Generated salary slip could not be marked for scheduled delivery.");
          }
          await emailAutomaticallyGeneratedSalarySlip(generatedSlip.id);
          results.push("generated");
        } else {
          console.error("Monthly salary slip generation failed:", user.id, res.error);
          results.push("error");
        }
      } catch (err) {
        console.error(
          "Monthly salary slip generation failed:",
          user.id,
          err instanceof Error ? err.message : "Unexpected error.",
        );
        results.push("error");
      }
    }

    const generated = results.filter((status) => status === "generated").length;
    const emailed = results.filter((status) => status === "emailed").length;
    const skipped = results.filter((status) => status === "skipped").length;
    const errors = results.filter((status) => status === "error").length;

    return {
      success: errors === 0,
      message: `Monthly payroll complete: ${generated} generated and emailed, ${emailed} pending slips emailed, ${skipped} skipped, ${errors} errors.`,
      generated,
      emailed,
      skipped,
      errors,
    };
  } catch (error) {
    console.error("Error auto-generating salary slips:", error);
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function getSalarySlipsAction(input: unknown) {
  try {
    const { session } = await getAuthenticatedUser();
    const parsed = salarySlipsQuerySchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: "Invalid salary slip filters.", details: parsed.error.issues };
    }
    const filters = parsed.data;
    const isSelf = !filters.userId || session.user.id === filters.userId;
    const isHrOrAdmin = 
      session.user.role === UserRole.SUPER_ADMIN || 
      session.user.role === UserRole.ADMIN || 
      (session.user.role === UserRole.STAFF && session.user.department === 'HR');

    if (!isSelf && !isHrOrAdmin) {
      return { success: false, error: "Unauthorized access to salary slips." };
    }
    if (
      !(await canPerformSalaryPermission(
        session.user,
        isHrOrAdmin ? "read-all" : "read-own",
      ))
    ) {
      return { success: false, error: "Unauthorized access to salary slips." };
    }
    if (isHrOrAdmin && !(await isSalaryPinSessionValid(session.user.id))) {
      return { success: false, error: "Unlock Salary Management with your PIN to continue." };
    }

    const whereClause = {
      ...(isHrOrAdmin
        ? filters.userId
          ? { userId: filters.userId }
          : {}
        : { userId: session.user.id }),
      ...(filters.month ? { month: filters.month } : {}),
      ...(filters.year ? { year: filters.year } : {}),
    };

    const slips = await prisma.salarySlip.findMany({
      where: whereClause,
      include: {
        user: { select: { name: true, email: true, department: true } },
        adjustments: {
          where: { removedAt: null },
          select: { id: true, type: true, description: true, amount: true },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: [
        { year: 'desc' },
        { month: 'desc' }
      ]
    });

    return { success: true, slips: JSON.parse(JSON.stringify(slips)) };
  } catch (error) {
    console.error("Error fetching salary slips:", error);
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function getSalarySlipByIdAction(slipId: string) {
  try {
    const { session } = await getAuthenticatedUser();
    const isHrOrAdmin =
      session.user.role === UserRole.SUPER_ADMIN ||
      session.user.role === UserRole.ADMIN ||
      (session.user.role === UserRole.STAFF && session.user.department === "HR");
    const canReadSlip = await canPerformSalaryPermission(
      session.user,
      isHrOrAdmin ? "read-all" : "read-own",
    );
    if (!canReadSlip) {
      return { success: false, error: "Unauthorized access to salary slip." };
    }
    if (isHrOrAdmin && !(await isSalaryPinSessionValid(session.user.id))) {
      return { success: false, error: "Unlock Salary Management with your PIN to continue." };
    }

    const slip = await prisma.salarySlip.findFirst({
      where: {
        id: slipId,
        ...(!isHrOrAdmin ? { userId: session.user.id } : {}),
      },
      include: {
        adjustments: {
          where: { removedAt: null },
          select: { id: true, type: true, description: true, amount: true },
          orderBy: { createdAt: "asc" },
        },
        user: {
          select: {
            name: true,
            email: true,
            department: true,
            designation: true,
            employeeId: true,
            dateOfJoining: true,
            bankName: true,
            bankAccountNo: true,
            bankIfsc: true,
            panNo: true,
            costCenter: true,
            uanNo: true,
            pfNo: true,
            esiNo: true,
          },
        },
      }
    });

    if (!slip) {
      return { success: false, error: "Salary slip not found." };
    }

    return { success: true, slip: JSON.parse(JSON.stringify(slip)) };
  } catch (error) {
    console.error("Error fetching salary slip by ID:", error);
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function updateSalarySlipAdjustmentsAction(input: unknown) {
  try {
    const { session } = await getAuthenticatedUser();
    const isHrOrAdmin =
      session.user.role === UserRole.SUPER_ADMIN ||
      session.user.role === UserRole.ADMIN ||
      (session.user.role === UserRole.STAFF && session.user.department === "HR");

    if (!isHrOrAdmin) {
      return { success: false, error: "Only Admins and HR can adjust salary slips." };
    }
    if (!(await canPerformSalaryPermission(session.user, "update"))) {
      return { success: false, error: "Only Admins and HR can adjust salary slips." };
    }
    if (!(await isSalaryPinSessionValid(session.user.id))) {
      return { success: false, error: "Unlock Salary Management with your PIN to continue." };
    }

    const validated = updateSalarySlipAdjustmentsSchema.safeParse(input);
    if (!validated.success) {
      return { success: false, error: "Invalid salary adjustments.", details: validated.error.issues };
    }

    const existing = await prisma.salarySlip.findUnique({
      where: { id: validated.data.slipId },
    });
    if (!existing) {
      return { success: false, error: "Salary slip not found." };
    }
    if (existing.status !== "GENERATED" || existing.approvedAt) {
      return { success: false, error: "Only generated, unpaid salary slips can be adjusted." };
    }

    const updated = await prisma.$transaction(async (tx) => {
      const isEarning = validated.data.type === "EARNING";
      const result = await tx.salarySlip.updateMany({
        where: {
          id: existing.id,
          status: "GENERATED",
          approvedAt: null,
          ...(isEarning ? {} : { netSalary: { gte: validated.data.amount } }),
        },
        data: {
          ...(isEarning
            ? {
                totalEarnings: { increment: validated.data.amount },
                netSalary: { increment: validated.data.amount },
              }
            : {
                totalDeductions: { increment: validated.data.amount },
                netSalary: { decrement: validated.data.amount },
              }),
        },
      });

      if (result.count !== 1) {
        return null;
      }

      await tx.salarySlipAdjustment.create({
        data: {
          salarySlipId: existing.id,
          createdById: session.user.id,
          type: validated.data.type,
          description: validated.data.description,
          amount: validated.data.amount,
        },
      });

      return tx.salarySlip.findUnique({
        where: { id: existing.id },
        include: {
          user: { select: { name: true, email: true, department: true } },
          adjustments: {
            where: { removedAt: null },
            select: { id: true, type: true, description: true, amount: true },
            orderBy: { createdAt: "asc" },
          },
        },
      });
    });

    if (!updated) {
      return {
        success: false,
        error: validated.data.type === "DEDUCTION"
          ? "This deduction exceeds the current net pay or the slip is no longer editable."
          : "The slip is no longer editable. Refresh and try again.",
      };
    }

    revalidatePath("/dashboard/salary");
    return { success: true, slip: JSON.parse(JSON.stringify(updated)) };
  } catch (error) {
    console.error("Error updating salary slip adjustments:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unexpected error updating salary adjustments.",
    };
  }
}

export async function removeSalarySlipAdjustmentAction(input: unknown) {
  try {
    const { session } = await getAuthenticatedUser();
    const isHrOrAdmin =
      session.user.role === UserRole.SUPER_ADMIN ||
      session.user.role === UserRole.ADMIN ||
      (session.user.role === UserRole.STAFF && session.user.department === "HR");
    if (
      !isHrOrAdmin ||
      !(await canPerformSalaryPermission(session.user, "update")) ||
      !(await isSalaryPinSessionValid(session.user.id))
    ) {
      return { success: false, error: "Only authorized HR or Admin users with an unlocked salary session can edit adjustments." };
    }

    const parsed = salarySlipAdjustmentRemovalSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: "Invalid salary adjustment.", details: parsed.error.issues };
    }

    const updated = await prisma.$transaction(async (tx) => {
      const adjustment = await tx.salarySlipAdjustment.findFirst({
        where: {
          id: parsed.data.adjustmentId,
          salarySlipId: parsed.data.slipId,
          removedAt: null,
          salarySlip: { status: "GENERATED", approvedAt: null },
        },
      });
      if (!adjustment) return null;

      const amount = Number(adjustment.amount);
      const isEarning = adjustment.type === "EARNING";
      const result = await tx.salarySlip.updateMany({
        where: {
          id: parsed.data.slipId,
          status: "GENERATED",
          approvedAt: null,
        },
        data: {
          ...(isEarning
            ? {
                totalEarnings: { decrement: amount },
                netSalary: { decrement: amount },
              }
            : {
                totalDeductions: { decrement: amount },
                netSalary: { increment: amount },
              }),
        },
      });
      if (result.count !== 1) return null;

      await tx.salarySlipAdjustment.update({
        where: { id: adjustment.id },
        data: { removedAt: new Date(), removedById: session.user.id },
      });
      return tx.salarySlip.findUnique({
        where: { id: parsed.data.slipId },
        include: {
          user: { select: { name: true, email: true, department: true } },
          adjustments: {
            where: { removedAt: null },
            select: { id: true, type: true, description: true, amount: true },
            orderBy: { createdAt: "asc" },
          },
        },
      });
    });

    if (!updated) {
      return { success: false, error: "The slip or adjustment is no longer editable. Refresh and try again." };
    }

    revalidatePath("/dashboard/salary");
    return { success: true, slip: JSON.parse(JSON.stringify(updated)) };
  } catch (error) {
    console.error("Error removing salary slip adjustment:", error);
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function approveSalarySlipAction(input: unknown) {
  try {
    const { session } = await getAuthenticatedUser();
    const isHrOrAdmin =
      session.user.role === UserRole.SUPER_ADMIN ||
      session.user.role === UserRole.ADMIN ||
      (session.user.role === UserRole.STAFF && session.user.department === "HR");
    if (
      !isHrOrAdmin ||
      !(await canPerformSalaryPermission(session.user, "update")) ||
      !(await isSalaryPinSessionValid(session.user.id))
    ) {
      return { success: false, error: "Only authorized HR or Admin users with an unlocked salary session can approve slips." };
    }

    const parsed = approveSalarySlipSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: "Invalid salary slip.", details: parsed.error.issues };
    }

    const approvedAt = new Date();
    const result = await prisma.salarySlip.updateMany({
      where: {
        id: parsed.data.slipId,
        status: "GENERATED",
        approvedAt: null,
      },
      data: {
        approvedAt,
        approvedById: session.user.id,
      },
    });
    if (result.count !== 1) {
      return { success: false, error: "Only generated slips can be approved. Refresh and try again." };
    }

    const slip = await prisma.salarySlip.findUnique({
      where: { id: parsed.data.slipId },
      include: {
        user: { select: { name: true, email: true, department: true } },
        adjustments: {
          where: { removedAt: null },
          select: { id: true, type: true, description: true, amount: true },
          orderBy: { createdAt: "asc" },
        },
      },
    });
    if (!slip) return { success: false, error: "Approved salary slip could not be reloaded." };

    revalidatePath("/dashboard/salary");
    return { success: true, slip: JSON.parse(JSON.stringify(slip)) };
  } catch (error) {
    console.error("Error approving salary slip:", error);
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function sendSalarySlipEmailAction(input: unknown) {
  try {
    const { session } = await getAuthenticatedUser();
    const isHrOrAdmin =
      session.user.role === UserRole.SUPER_ADMIN ||
      session.user.role === UserRole.ADMIN ||
      (session.user.role === UserRole.STAFF && session.user.department === "HR");
    if (
      !isHrOrAdmin ||
      !(await canPerformSalaryPermission(session.user, "update")) ||
      !(await isSalaryPinSessionValid(session.user.id))
    ) {
      return { success: false, error: "Only authorized HR or Admin users with an unlocked salary session can email slips." };
    }

    const parsed = sendSalarySlipEmailSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: "Invalid salary slip.", details: parsed.error.issues };
    }

    const slip = await prisma.salarySlip.findUnique({
      where: { id: parsed.data.slipId },
      select: {
        id: true,
        month: true,
        year: true,
        status: true,
        approvedAt: true,
        netSalary: true,
        user: { select: { name: true, email: true } },
      },
    });
    if (!slip) return { success: false, error: "Salary slip not found." };
    if (
      !(slip.status === "GENERATED" && slip.approvedAt) &&
      slip.status !== "PAID"
    ) {
      return { success: false, error: "Approve the salary slip before emailing it." };
    }
    if (!slip.user.email) {
      return { success: false, error: "The employee does not have an email address." };
    }

    const requestHeaders = await headers();
    const cookieHeader = requestHeaders.get("cookie");
    if (!cookieHeader) {
      return { success: false, error: "Your session could not be forwarded to generate the PDF. Sign in again." };
    }

    const pdfUrl = new URL(
      `/api/salary/slips/${encodeURIComponent(slip.id)}/pdf`,
      env.NEXT_PUBLIC_SITE_URL,
    );
    const pdfResponse = await fetch(pdfUrl, {
      headers: {
        cookie: cookieHeader,
        "X-Tunnel-Skip-AntiPhishing-Page": "true",
      },
      cache: "no-store",
    });
    if (!pdfResponse.ok || !pdfResponse.headers.get("content-type")?.includes("application/pdf")) {
      console.error("Salary slip PDF could not be generated for email:", slip.id, pdfResponse.status);
      return { success: false, error: "Could not generate the salary slip PDF. No email was sent." };
    }

    const monthName = new Date(Date.UTC(slip.year, slip.month - 1, 1)).toLocaleString("en", {
      month: "long",
      timeZone: "UTC",
    });
    await sendSalarySlipPdfEmail({
      email: slip.user.email,
      employeeName: slip.user.name,
      monthName,
      year: slip.year,
      pdf: Buffer.from(await pdfResponse.arrayBuffer()),
    });

    const emailSentAt = new Date();
    const updated = await prisma.salarySlip.updateMany({
      where: {
        id: slip.id,
        OR: [
          { status: "GENERATED", approvedAt: { not: null } },
          { status: "PAID" },
        ],
      },
      data: { emailSentAt, emailSentById: session.user.id },
    });
    if (updated.count !== 1) {
      return { success: false, error: "Email was sent, but the delivery record could not be saved. Check the email before retrying." };
    }

    revalidatePath("/dashboard/salary");
    return { success: true, emailSentAt: emailSentAt.toISOString() };
  } catch (error) {
    console.error("Error emailing salary slip:", error);
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function updateSalarySlipStatusAction(input: unknown) {
  try {
    const { session } = await getAuthenticatedUser();

    const isHrOrAdmin =
      session.user.role === UserRole.SUPER_ADMIN ||
      session.user.role === UserRole.ADMIN ||
      (session.user.role === UserRole.STAFF && session.user.department === 'HR');

    if (!isHrOrAdmin) {
      return { success: false, error: "Only Admins and HR can update salary slip status." };
    }
    if (!(await canPerformSalaryPermission(session.user, "mark-paid"))) {
      return { success: false, error: "Only Admins and HR can update salary slip status." };
    }
    if (!(await isSalaryPinSessionValid(session.user.id))) {
      return { success: false, error: "Unlock Salary Management with your PIN to continue." };
    }

    const validated = updateSalarySlipStatusSchema.parse(input);

    const existing = await prisma.salarySlip.findUnique({
      where: { id: validated.slipId },
    });

    if (!existing) {
      return { success: false, error: "Salary slip not found." };
    }

    if (existing.status !== "GENERATED" || !existing.approvedAt) {
      return { success: false, error: "Approve the salary slip before marking it as paid." };
    }

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.salarySlip.updateMany({
        where: {
          id: validated.slipId,
          status: "GENERATED",
          approvedAt: { not: null },
        },
        data: {
          status: "PAID",
          paymentDate: new Date(`${validated.paymentDate}T00:00:00.000Z`),
          paymentMethod: validated.paymentMethod,
          referenceId: validated.referenceId || null,
          notes: validated.notes || null,
        },
      });

      if (result.count !== 1) {
        return null;
      }

      return tx.salarySlip.findUnique({
        where: { id: validated.slipId },
        include: { user: { select: { name: true, email: true, department: true } } },
      });
    });

    if (!updated) {
      return { success: false, error: "Salary slip was updated by another request. Refresh and try again." };
    }

    return { success: true, slip: JSON.parse(JSON.stringify(updated)) };
  } catch (error) {
    console.error("Error updating salary slip status:", error);
    return { success: false, error: getErrorMessage(error) };
  }
}
