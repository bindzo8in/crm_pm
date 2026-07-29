"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { UserRole } from "@/app/generated/prisma/enums";
import { headers } from "next/headers";
import {
  saveSalaryStructureSchema,
  SaveSalaryStructureInput,
  generateSalarySlipSchema,
  GenerateSalarySlipInput,
  updateSalarySlipStatusSchema,
  UpdateSalarySlipStatusInput,
} from "@/lib/schemas/salary-schema";

async function getAuthenticatedUser() {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({ headers: reqHeaders });
  if (!session || !session.user) {
    throw new Error("Unauthorized");
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

    let structure = await prisma.salaryStructure.findUnique({
      where: { userId },
    });

    return { success: true, structure: structure ? JSON.parse(JSON.stringify(structure)) : null };
  } catch (error: any) {
    console.error("Error fetching salary structure:", error);
    return { success: false, error: error.message };
  }
}

export async function saveSalaryStructureAction(input: SaveSalaryStructureInput) {
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

    const validated = saveSalaryStructureSchema.parse(input);

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
        customComponents: validated.customComponents || [],
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
  } catch (error: any) {
    console.error("Error saving salary structure:", error);
    return { success: false, error: error.message };
  }
}

function getDaysInMonth(month: number, year: number) {
  return new Date(year, month, 0).getDate();
}

export async function generateSalarySlipAction(input: GenerateSalarySlipInput) {
  try {
    const { session } = await getAuthenticatedUser();
    const isHrOrAdmin = 
      session.user.role === UserRole.SUPER_ADMIN || 
      session.user.role === UserRole.ADMIN || 
      (session.user.role === UserRole.STAFF && session.user.department === 'HR');

    if (!isHrOrAdmin) {
      return { success: false, error: "Only Admins and HR can generate salary slips." };
    }

    const validated = generateSalarySlipSchema.parse(input);
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
    let missingDays = totalDaysInMonth - (presentDays + halfDays + absentDays + totalLeaveDaysTaken);
    // Usually weekends are paid. Let's just consider absentDays, halfDays (0.5), and leaves.
    
    let allowedPaidLeaves = 1;
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
    const customComps = structure.customComponents as Array<{name: string, type: string, amount: number}> || [];
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
      
      customComponents: [
        ...customComps, 
        ...(medicalReimbursement > 0 ? [{ name: "Medical Reimbursement", type: "EARNING", amount: medicalReimbursement }] : []),
        ...(extraEarnings > 0 ? [{ name: "Extra Earnings", type: "EARNING", amount: extraEarnings }] : []),
        ...(extraDeductions > 0 ? [{ name: "Extra Deductions", type: "DEDUCTION", amount: extraDeductions }] : [])
      ],
      
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
  } catch (error: any) {
    console.error("Error generating salary slip:", error);
    return { success: false, error: error.message };
  }
}

export async function getSalarySlipsAction(filters: { userId?: string, month?: number, year?: number }) {
  try {
    const { session } = await getAuthenticatedUser();
    const isSelf = filters.userId && session.user.id === filters.userId;
    const isHrOrAdmin = 
      session.user.role === UserRole.SUPER_ADMIN || 
      session.user.role === UserRole.ADMIN || 
      (session.user.role === UserRole.STAFF && session.user.department === 'HR');

    if (!isSelf && !isHrOrAdmin) {
      return { success: false, error: "Unauthorized access to salary slips." };
    }

    const whereClause: any = {};
    if (filters.userId) whereClause.userId = filters.userId;
    if (filters.month) whereClause.month = filters.month;
    if (filters.year) whereClause.year = filters.year;

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
  } catch (error: any) {
    console.error("Error fetching salary slips:", error);
    return { success: false, error: error.message };
  }
}

export async function getSalarySlipByIdAction(slipId: string) {
  try {
    const { session } = await getAuthenticatedUser();
    
    const slip = await prisma.salarySlip.findUnique({
      where: { id: slipId },
      include: {
        user: { select: { name: true, email: true, department: true } }
      }
    });

    if (!slip) {
      return { success: false, error: "Salary slip not found." };
    }

    const isSelf = session.user.id === slip.userId;
    const isHrOrAdmin = 
      session.user.role === UserRole.SUPER_ADMIN || 
      session.user.role === UserRole.ADMIN || 
      (session.user.role === UserRole.STAFF && session.user.department === 'HR');

    if (!isSelf && !isHrOrAdmin) {
      return { success: false, error: "Unauthorized access to salary slip." };
    }

    return { success: true, slip: JSON.parse(JSON.stringify(slip)) };
  } catch (error: any) {
    console.error("Error fetching salary slip by ID:", error);
    return { success: false, error: error.message };
  }
}
