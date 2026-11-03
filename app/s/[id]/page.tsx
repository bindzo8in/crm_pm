import { getSalarySlipByIdAction } from "@/actions/salary";
import { SalarySlipRenderer } from "@/components/salary/salary-slip-renderer";
import DashboardProviders from "@/app/dashboard/providers";
import { Metadata } from "next";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/lib/auth";
import { cookies, headers } from "next/headers";
import { UserRole } from "@/app/generated/prisma/enums";
import { hasSalaryPin, isSalaryPinSessionValid } from "@/lib/salary-pin";
import { SalaryPinGate } from "@/components/salary/salary-pin-gate";
import { verifySalaryPdfCronToken } from "@/lib/salary-pdf-cron-auth";

async function getSlipForPage(id: string) {
  const cookieStore = await cookies();
  if (!verifySalaryPdfCronToken(id, cookieStore.get("salary_pdf_cron")?.value)) {
    return getSalarySlipByIdAction(id);
  }

  const slip = await prisma.salarySlip.findUnique({
    where: { id },
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
    },
  });
  return slip
    ? { success: true as const, slip: JSON.parse(JSON.stringify(slip)) }
    : { success: false as const, error: "Salary slip not found." };
}

export async function generateMetadata(props: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const params = await props.params;
  const res = await getSlipForPage(params.id);

  if (!res.success || !res.slip) {
    return { title: "Salary Slip Not Found" };
  }

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthStr = monthNames[res.slip.month - 1];

  return {
    title: `Salary Slip - ${res.slip.user.name} - ${monthStr} ${res.slip.year}`,
  };
}

interface SalarySlipPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ pdf?: string }>;
}

export default async function SalarySlipPage({ params, searchParams }: SalarySlipPageProps) {
  const { id } = await params;
  const { pdf } = await searchParams;
  const isPdfMode = pdf === "1";
  const session = await auth.api.getSession({ headers: await headers() });
  const isSalaryManager =
    session?.user.role === UserRole.SUPER_ADMIN ||
    session?.user.role === UserRole.ADMIN ||
    (session?.user.role === UserRole.STAFF && session.user.department === "HR");

  if (isSalaryManager && session) {
    const isConfigured = await hasSalaryPin(session.user.id);
    const isUnlocked =
      isConfigured && (await isSalaryPinSessionValid(session.user.id));
    if (!isUnlocked) {
      return (
        <DashboardProviders>
          <main className="min-h-screen bg-background px-4 py-8">
            <SalaryPinGate
              email={session.user.email}
              isConfigured={isConfigured}
              isUnlocked={false}
            />
          </main>
        </DashboardProviders>
      );
    }
  }

  const res = await getSlipForPage(id);
  const company = await prisma.company.findFirst();

  if (!res.success || !res.slip) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 text-gray-500 font-sans">
        <div className="text-center p-8 bg-white rounded-xl shadow-sm border border-gray-100 max-w-md w-full">
          <h1 className="text-xl font-bold text-gray-900 mb-2">Slip Unavailable</h1>
          <p className="text-gray-500">This salary slip could not be found or you do not have permission to view it.</p>
        </div>
      </div>
    );
  }

  const content = isPdfMode ? (
      <DashboardProviders>
        <div className="pdf-renderer-document bg-white p-0 m-0">
          <SalarySlipRenderer slip={res.slip} company={company} isPdfMode={true} />
        </div>
      </DashboardProviders>
  ) : (
    <DashboardProviders>
      <div className="min-h-screen bg-gray-50/50 p-4 md:p-8">
        <div className="mx-auto mb-6 flex max-w-4xl items-center justify-between gap-3">
          <Link
            href="/dashboard/salary"
            className="inline-flex h-10 items-center gap-2 rounded-md border bg-background px-3 text-sm font-medium hover:bg-muted"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Back to salary
          </Link>
          <a
            href={`/api/salary/slips/${id}/pdf`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
          >
            Download PDF
          </a>
        </div>
        <SalarySlipRenderer slip={res.slip} company={company} />
      </div>
    </DashboardProviders>
  );

  if (isSalaryManager && session) {
    return (
      <SalaryPinGate
        email={session.user.email}
        isConfigured
        isUnlocked
      >
        {content}
      </SalaryPinGate>
    );
  }

  return content;
}
