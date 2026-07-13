import prisma from "@/lib/prisma";

export async function TariffFooter() {
  const company = await prisma.company.findFirst();

  let safeCompany = company;
  if (company && typeof company.logo === "string") {
    try {
      safeCompany = { ...company, logo: JSON.parse(company.logo) };
    } catch (e) {
      console.error("Failed to parse company logo", e);
    }
  }

  if (!safeCompany) return null;

  return (
    <footer className="fixed bottom-0 w-full bg-white/90 backdrop-blur-sm border-t p-3 shadow-[0_-4px_15px_-5px_rgba(0,0,0,0.1)] z-40 flex items-center justify-center gap-3 print:hidden">
      {(safeCompany?.logo as any)?.url && (
        <img src={(safeCompany?.logo as any).url} alt="Company Logo" className="h-8 object-contain" />
      )}
      <span className="font-semibold text-slate-700 text-sm">
        {safeCompany?.displayName || safeCompany?.legalName || 'Company Name'}
      </span>
      {safeCompany?.website && (
        <>
          <span className="text-gray-300">|</span>
          <a
            href={safeCompany.website.startsWith('http') ? safeCompany.website : `https://${safeCompany.website}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:text-primary/80 hover:underline text-sm font-medium transition-colors"
          >
            {safeCompany.website.replace(/^https?:\/\//, '')}
          </a>
        </>
      )}
    </footer>
  );
}
