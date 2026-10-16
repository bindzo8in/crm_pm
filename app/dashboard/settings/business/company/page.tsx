import { GetCompany } from "@/actions/company";
import DashboardContainer from "@/app/dashboard/dashboard-container";
import { CompanyProfileForm } from "@/components/settings/company-profile-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { requirePageAccess } from "@/lib/auth-guard";
import type { CompanyFormValues } from "@/lib/schemas/company";

export const metadata = {
  title: "Company Profile Settings",
};

export default async function CompanyProfilePage() {
  await requirePageAccess("/dashboard/settings");
  const result = await GetCompany();

  if ("error" in result) {
    return (
      <DashboardContainer title="Business settings">
        <Alert variant="destructive">
          <AlertTitle>Company profile could not be loaded</AlertTitle>
          <AlertDescription>{result.message}</AlertDescription>
        </Alert>
      </DashboardContainer>
    );
  }

  const defaultValues: CompanyFormValues | undefined = result.company
    ? {
        ...result.company,
        logo: getImageValue(result.company.logo),
        darkLogo: getImageValue(result.company.darkLogo),
        favicon: getImageValue(result.company.favicon),
        signatureImage: getImageValue(result.company.signatureImage),
        sealImage: getImageValue(result.company.sealImage),
      }
    : undefined;

  return (
    <DashboardContainer title="Business settings">
      <CompanyProfileForm defaultValues={defaultValues} />
    </DashboardContainer>
  );
}

function getImageValue(value: unknown): CompanyFormValues["logo"] {
  let image = value;
  if (typeof image === "string") {
    try {
      image = JSON.parse(image);
    } catch {
      return null;
    }
  }

  if (
    typeof image !== "object" ||
    image === null ||
    Array.isArray(image) ||
    !("url" in image) ||
    !("publicId" in image) ||
    typeof image.url !== "string" ||
    typeof image.publicId !== "string"
  ) {
    return null;
  }

  return { url: image.url, publicId: image.publicId };
}
