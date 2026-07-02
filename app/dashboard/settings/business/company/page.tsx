import { GetCompany } from "@/actions/company";
import DashboardContainer from "@/app/dashboard/dashboard-container";
import { CompanyProfileForm } from "@/components/settings/company-profile-form";
import { notFound } from "next/navigation";

export const metadata = {
  title: "Company Profile Settings",
};

export default async function CompanyProfilePage() {
  const result = await GetCompany();

  if (result.error && result.error === "Unauthorized") {
    // Or you could show a NotAuthorized component
    return <div className="p-8 text-red-500">You do not have permission to view this page.</div>;
  }

  return (
    <DashboardContainer title="Business Settings">
      <CompanyProfileForm defaultValues={result.company} />
    </DashboardContainer>
  );
}
