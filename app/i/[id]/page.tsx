import { getPublicInvoiceById } from "@/actions/invoice";
import { InvoiceDetailView } from "@/components/invoice/invoice-detail-view";
import DashboardProviders from "@/app/dashboard/providers";
import { Metadata } from "next";

export async function generateMetadata(props: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const params = await props.params;
  const res = await getPublicInvoiceById(params.id);

  if (!res.success || !res.data) {
    return { title: "Invoice Not Found" };
  }

  const invNum = String(res.data.invoiceNumber).padStart(4, "0");
  return {
    title: `Invoice INV-${invNum} - ${res.data.customerDisplayName || "Client"}`,
  };
}

interface PublicInvoicePageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ pdf?: string }>;
}

export default async function PublicInvoicePage({ params, searchParams }: PublicInvoicePageProps) {
  const { id } = await params;
  const { pdf } = await searchParams;
  const isPdfMode = pdf === "1";

  const res = await getPublicInvoiceById(id);

  if (!res.success || !res.data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 text-gray-500 font-sans">
        <div className="text-center p-8 bg-white rounded-xl shadow-sm border border-gray-100 max-w-md w-full">
          <h1 className="text-xl font-bold text-gray-900 mb-2">Invoice Unavailable</h1>
          <p className="text-gray-500">This invoice could not be found or the link is invalid.</p>
        </div>
      </div>
    );
  }

  if (isPdfMode) {
    return (
      <DashboardProviders>
        <div className="pdf-renderer-document bg-white p-0 m-0">
          <InvoiceDetailView invoiceId={id} isPdfMode={true} />
        </div>
      </DashboardProviders>
    );
  }

  return (
    <DashboardProviders>
      <div className="min-h-screen bg-gray-50/50 p-4 md:p-8">
        <InvoiceDetailView invoiceId={id} />
      </div>
    </DashboardProviders>
  );
}
