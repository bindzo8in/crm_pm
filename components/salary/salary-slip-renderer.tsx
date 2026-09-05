"use client";

import React from "react";
import { env } from "@/lib/env";

function getImageUrl(field: any): string | null {
  if (!field) return null;
  if (typeof field === "string") {
    try {
      const parsed = JSON.parse(field);
      return parsed.url || null;
    } catch {
      return null;
    }
  }
  if (typeof field === "object" && field.url) {
    return field.url;
  }
  return null;
}

function numberToWords(amount: number): string {
  const single = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
  const double = ["Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "Ten", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  
  if (amount === 0) return "Zero";
  
  let word = "";
  let val = Math.floor(amount);
  
  if (val >= 10000000) {
    word += numberToWords(Math.floor(val / 10000000)) + " Crore ";
    val %= 10000000;
  }
  if (val >= 100000) {
    word += numberToWords(Math.floor(val / 100000)) + " Lakh ";
    val %= 100000;
  }
  if (val >= 1000) {
    word += numberToWords(Math.floor(val / 1000)) + " Thousand ";
    val %= 1000;
  }
  if (val >= 100) {
    word += numberToWords(Math.floor(val / 100)) + " Hundred ";
    val %= 100;
  }
  
  if (val > 0) {
    if (val < 10) word += single[val];
    else if (val < 20) word += double[val - 10];
    else {
      word += tens[Math.floor(val / 10)];
      if (val % 10 > 0) word += " " + single[val % 10];
    }
  }
  return word.trim();
}

export function SalarySlipRenderer({ slip, company, isPdfMode = false }: { slip: any, company?: any, isPdfMode?: boolean }) {
  if (!slip) {
    return <div className="p-8 text-center text-destructive font-semibold">Slip not found</div>;
  }

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const monthName = monthNames[slip.month - 1];

  const companyLogoUrl = getImageUrl(company?.logo);
  const companyName = company?.legalName || company?.displayName || env.NEXT_PUBLIC_APP_NAME || "Company";
  const companyAddress = [
    company?.address,
    company?.city,
    [company?.state, company?.postalCode].filter(Boolean).join(" - ")
  ].filter(Boolean).join(", ");

  const formatVal = (val: any) => (val > 0 ? Number(val).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00");

  return (
    <div className={`mx-auto bg-white text-black font-sans ${isPdfMode ? "w-[794px] min-h-[1123px] p-8" : "max-w-4xl p-8 shadow-xl border border-gray-200"}`}>
      
      {/* Header */}
      <div className="relative mb-6">
        {companyLogoUrl && (
          <div className="absolute left-0 top-0 w-24">
            <img src={companyLogoUrl} alt="Logo" className="w-full object-contain mix-blend-multiply" crossOrigin="anonymous" />
          </div>
        )}
        <div className="text-center px-28">
          <h1 className="text-xl font-bold mb-1 tracking-tight">{companyName}</h1>
          <div className="text-[13px] text-gray-800 leading-snug">
            {companyAddress || "Company Address Here"}
          </div>
        </div>
      </div>

      <div className="text-center mb-6 mt-8">
        <h2 className="text-lg font-bold">
          Payslip for the month of {monthName} {slip.year}
        </h2>
      </div>

      {/* Employee Details Box */}
      <div className="border border-gray-400 mb-6 grid grid-cols-2 text-[13px] leading-relaxed">
        <div className="border-r border-gray-400 p-2 space-y-0.5">
          <div className="grid grid-cols-[140px_1fr]"><span className="text-gray-800">Name:</span><span className="font-medium">{slip.user?.name}</span></div>
          <div className="grid grid-cols-[140px_1fr]"><span className="text-gray-800">Designation:</span><span className="font-medium">{slip.user?.designation || "-"}</span></div>
          <div className="grid grid-cols-[140px_1fr]"><span className="text-gray-800">Department:</span><span className="font-medium">{slip.user?.department || "-"}</span></div>
          <div className="grid grid-cols-[140px_1fr]"><span className="text-gray-800">Work Location:</span><span className="font-medium">{company?.city || "-"}</span></div>
          <div className="grid grid-cols-[140px_1fr]"><span className="text-gray-800">Effective Work Days:</span><span className="font-medium">{slip.paidDays}</span></div>
          <div className="grid grid-cols-[140px_1fr]"><span className="text-gray-800">LOP:</span><span className="font-medium">{slip.absentDays}</span></div>
        </div>
        <div className="p-2 space-y-0.5">
          <div className="grid grid-cols-[140px_1fr]"><span className="text-gray-800">Employee No.:</span><span className="font-medium">{slip.user?.employeeId || "-"}</span></div>
          <div className="grid grid-cols-[140px_1fr]"><span className="text-gray-800">Bank Name:</span><span className="font-medium uppercase">{slip.user?.bankName || "-"}</span></div>
          <div className="grid grid-cols-[140px_1fr]"><span className="text-gray-800">Bank Account No.:</span><span className="font-medium">{slip.user?.bankAccountNo || "-"}</span></div>
          <div className="grid grid-cols-[140px_1fr]"><span className="text-gray-800">PAN No.:</span><span className="font-medium">{slip.user?.panNo || "-"}</span></div>
          <div className="grid grid-cols-[140px_1fr]"><span className="text-gray-800">Cost Center:</span><span className="font-medium">{slip.user?.costCenter || "-"}</span></div>
          <div className="grid grid-cols-[140px_1fr]"><span className="text-gray-800">UAN No.:</span><span className="font-medium">{slip.user?.uanNo || "-"}</span></div>
          <div className="grid grid-cols-[140px_1fr]"><span className="text-gray-800">PF No.:</span><span className="font-medium">{slip.user?.pfNo || "-"}</span></div>
        </div>
      </div>

      {/* Salary Breakdown Table */}
      <table className="w-full border-collapse border border-gray-400 text-[13px] mb-8">
        <thead>
          <tr>
            <th colSpan={2} className="border border-gray-400 py-1 font-bold text-center">Earnings</th>
            <th colSpan={2} className="border border-gray-400 py-1 font-bold text-center">Deduction</th>
          </tr>
          <tr className="border-b border-gray-400">
            <th className="px-2 py-1 text-left font-bold w-1/4">Item</th>
            <th className="px-2 py-1 text-right font-bold w-1/4">Amount</th>
            <th className="border-l border-gray-400 px-2 py-1 text-left font-bold w-1/4">Item</th>
            <th className="px-2 py-1 text-right font-bold w-1/4">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            {/* Earnings Column */}
            <td colSpan={2} className="border-r border-gray-400 p-0 align-top">
              <div className="space-y-1.5 p-2">
                <div className="flex justify-between"><span>Basic</span><span>{formatVal(slip.basicSalary)}</span></div>
                <div className="flex justify-between"><span>HRA</span><span>{formatVal(slip.hra)}</span></div>
                <div className="flex justify-between"><span>Conveyance</span><span>{formatVal(slip.conveyance)}</span></div>
                <div className="flex justify-between"><span>Medical Allowance</span><span>{formatVal(slip.medical)}</span></div>
                <div className="flex justify-between"><span>Special Allowance</span><span>{formatVal(slip.specialAllowance)}</span></div>
                {slip.customComponents?.filter((c: any) => c.type === "EARNING").map((comp: any, i: number) => (
                  <div key={i} className="flex justify-between"><span>{comp.name}</span><span>{formatVal(comp.amount)}</span></div>
                ))}
                {/* Visual filler to pad the cell height a bit */}
                <div className="h-4"></div>
              </div>
            </td>
            {/* Deductions Column */}
            <td colSpan={2} className="p-0 align-top">
              <div className="space-y-1.5 p-2">
                <div className="flex justify-between"><span>PF</span><span>{formatVal(slip.providentFund)}</span></div>
                <div className="flex justify-between"><span>Prof Tax</span><span>{formatVal(slip.professionalTax)}</span></div>
                <div className="flex justify-between"><span>TDS</span><span>{formatVal(slip.tds)}</span></div>
                <div className="flex justify-between"><span>LOP Deduction</span><span>{formatVal(slip.absentDeduction)}</span></div>
                {slip.customComponents?.filter((c: any) => c.type === "DEDUCTION").map((comp: any, i: number) => (
                  <div key={i} className="flex justify-between"><span>{comp.name}</span><span>{formatVal(comp.amount)}</span></div>
                ))}
              </div>
            </td>
          </tr>
          {/* Totals */}
          <tr className="border-t border-gray-400 font-bold">
            <td className="p-2 border-r border-gray-400">Total Earnings:INR.</td>
            <td className="p-2 text-right border-r border-gray-400">{formatVal(Number(slip.totalEarnings) + Number(slip.absentDeduction))}</td>
            <td className="p-2 border-r border-gray-400">Total Deductions:INR.</td>
            <td className="p-2 text-right">{formatVal(Number(slip.totalDeductions) + Number(slip.absentDeduction))}</td>
          </tr>
        </tbody>
      </table>
      {/* Net Pay */}
      <div className="mb-4">
        <div className="flex items-center gap-4 text-[14px]">
          <span className="font-bold">Net Pay for the month :</span>
          <span className="font-bold">{formatVal(slip.netSalary)}</span>
        </div>
      </div>
      <div className="italic text-[13px] text-gray-800">
        (Rupees {numberToWords(slip.netSalary)} Only)
      </div>

      {/* Footer */}
      <div className="mt-16 text-center text-[12px] text-gray-500 border-t border-gray-300 pt-2 italic">
        This is a system generated payslip and does not require signature.
      </div>
    </div>
  );
}
