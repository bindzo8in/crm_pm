"use server";

import prisma from "@/lib/prisma";
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
  salaryComponentsSchema,
  salarySlipsQuerySchema,
} from "@/lib/schemas/salary-schema";

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

    const parsed = saveSalaryStructureSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: "Invalid salary structure.", details: parsed.error.issues };
    }
    const validated = parsed.data;

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

    const parsed = generateSalarySlipSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: "Invalid salary slip input.", details: parsed.error.issues };
    }
    const validated = parsed.data;
    const { userId, month, year, medicalReimbursement, extraEarnings, extraDeductions } = validated;

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
      const duration = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      totalLeaveDaysTaken += duration;
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
    
    const allowedPaidLeaves = 1;
    let paidLeaveConsumed = 0;

    if (totalLeaveDaysTaken > 0) {
      paidLeaveConsumed = Math.min(allowedPaidLeaves, totalLeaveDaysTaken);
    }
    
    const unpaidLeaves = totalLeaveDaysTaken - paidLeaveConsumed;

    // Total LOP Days = absentDays + (halfDays * 0.5) + unpaidLeaves
    const lopDays = absentDays + (halfDays * 0.5) + unpaidLeaves;

    const paidDays = totalDaysInMonth - lopDays;

    // Gross Salary Base
    const grossBase = 
      Number(structure.basicSalary) + 
      Number(structure.hra) + 
      Number(structure.conveyance) + 
      Number(structure.medical) + 
      Number(structure.specialAllowance);

    const perDayGross = grossBase / totalDaysInMonth;
    
    const absentDeduction = lopDays * perDayGross;

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

    const totalEarnings = grossBase - absentDeduction + customEarnings;
    
    const fixedDeductions = 
      Number(structure.providentFund) + 
      Number(structure.professionalTax) + 
      Number(structure.tds);
      
    const totalDeductionsCalc = fixedDeductions + customDeductions;
    const netSalary = totalEarnings - totalDeductionsCalc;

    const slipData = {
      userId,
      month,
      year,
      status: "GENERATED" as const,
      totalDays: totalDaysInMonth,
      paidDays,
      presentDays,
      absentDays: absentDays + unpaidLeaves, // Combine them for visual simplicity
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
      
      absentDeduction,
      halfDayDeduction: 0, // already merged into absentDeduction via lopDays
      
      medicalReimbursement,
      extraEarnings,
      extraDeductions,
      customComponents: customComps,
      
      totalEarnings,
      totalDeductions: totalDeductionsCalc,
      netSalary
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

    const validated = autoGenerateMonthlySalarySlipsSchema.safeParse(input);
    if (!validated.success) {
      return { success: false, error: "Invalid month or year.", details: validated.error.issues };
    }
    const { month, year } = validated.data;

    const usersWithStructures = await prisma.user.findMany({
      where: { salaryStructure: { isNot: null } },
      select: { id: true },
    });

    const results: Array<"generated" | "skipped" | "error"> = [];

    for (const user of usersWithStructures) {
      try {
        const existing = await prisma.salarySlip.findUnique({
          where: {
            userId_month_year: { userId: user.id, month, year },
          },
        });

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
    const skipped = results.filter((status) => status === "skipped").length;
    const errors = results.filter((status) => status === "error").length;

    return {
      success: errors === 0,
      message: `Auto-generation complete: ${generated} generated, ${skipped} skipped, ${errors} errors.`,
      generated,
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
        user: { select: { name: true, email: true, department: true } }
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

    const slip = await prisma.salarySlip.findFirst({
      where: {
        id: slipId,
        ...(!isHrOrAdmin ? { userId: session.user.id } : {}),
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            department: true,
            designation: true,
            employeeId: true,
            bankName: true,
            bankAccountNo: true,
            panNo: true,
            costCenter: true,
            uanNo: true,
            pfNo: true,
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
    if (existing.status !== "GENERATED") {
      return { success: false, error: "Only generated, unpaid salary slips can be adjusted." };
    }

    const parsedComponents = salaryComponentsSchema.safeParse(existing.customComponents ?? []);
    if (!parsedComponents.success) {
      console.error("Salary slip contains invalid custom components:", existing.id);
      return { success: false, error: "Salary slip components could not be safely adjusted." };
    }

    const roundMoney = (amount: number) => Math.round((amount + Number.EPSILON) * 100) / 100;
    const fixedEarnings =
      Number(existing.basicSalary) +
      Number(existing.hra) +
      Number(existing.conveyance) +
      Number(existing.medical) +
      Number(existing.specialAllowance);
    const customEarnings = parsedComponents.data
      .filter((component) => component.type === "EARNING")
      .reduce((total, component) => total + component.amount, 0);
    const customDeductions = parsedComponents.data
      .filter((component) => component.type === "DEDUCTION")
      .reduce((total, component) => total + component.amount, 0);
    const medicalReimbursement = validated.data.medicalReimbursement;
    const extraEarnings = validated.data.extraEarnings;
    const extraDeductions = validated.data.extraDeductions;
    const absentDeduction = Number(existing.absentDeduction);
    const totalEarnings = roundMoney(
      fixedEarnings - absentDeduction + customEarnings + medicalReimbursement + extraEarnings,
    );
    const totalDeductions = roundMoney(
      Number(existing.providentFund) +
        Number(existing.professionalTax) +
        Number(existing.tds) +
        customDeductions +
        extraDeductions,
    );
    const netSalary = roundMoney(totalEarnings - totalDeductions);

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.salarySlip.updateMany({
        where: { id: existing.id, status: "GENERATED" },
        data: {
          medicalReimbursement,
          extraEarnings,
          extraDeductions,
          totalEarnings,
          totalDeductions,
          netSalary,
        },
      });

      if (result.count !== 1) {
        return null;
      }

      return tx.salarySlip.findUnique({
        where: { id: existing.id },
        include: { user: { select: { name: true, email: true, department: true } } },
      });
    });

    if (!updated) {
      return { success: false, error: "Salary slip was updated by another request. Refresh and try again." };
    }

    return { success: true, slip: JSON.parse(JSON.stringify(updated)) };
  } catch (error) {
    console.error("Error updating salary slip adjustments:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unexpected error updating salary adjustments.",
    };
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

    const validated = updateSalarySlipStatusSchema.parse(input);

    const existing = await prisma.salarySlip.findUnique({
      where: { id: validated.slipId },
    });

    if (!existing) {
      return { success: false, error: "Salary slip not found." };
    }

    if (existing.status !== "GENERATED") {
      return { success: false, error: "Only generated, unpaid salary slips can be marked as paid." };
    }

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.salarySlip.updateMany({
        where: { id: validated.slipId, status: "GENERATED" },
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
