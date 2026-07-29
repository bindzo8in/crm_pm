import { getSalarySlipByIdAction } from "@/actions/salary";
import { SalarySlipRenderer } from "@/components/salary/salary-slip-renderer";
import DashboardProviders from "@/app/dashboard/providers";
import { Metadata } from "next";
import prisma from "@/lib/prisma";

export async function generateMetadata(props: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const params = await props.params;
  const res = await getSalarySlipByIdAction(params.id);

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

  const res = await getSalarySlipByIdAction(id);
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

  if (isPdfMode) {
    return (
      <DashboardProviders>
        <div className="pdf-renderer-document bg-white p-0 m-0">
          <SalarySlipRenderer slip={res.slip} company={company} isPdfMode={true} />
        </div>
      </DashboardProviders>
    );
  }

  return (
    <DashboardProviders>
      <div className="min-h-screen bg-gray-50/50 p-4 md:p-8">
        <div className="max-w-4xl mx-auto mb-6 flex justify-end">
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
}
