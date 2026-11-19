export const metadata = { title: "Edit product" };

import { getProduct } from "@/actions/products";
import { ProductForm } from "@/components/products/create-edit";
import { requirePageAccess } from "@/lib/auth-guard";
import DashboardContainer from "@/app/dashboard/dashboard-container";

export default async function EditProductPage({
  params,
}: PageProps<"/dashboard/products/[id]/edit">) {
  await requirePageAccess("/dashboard/products");
  const { id } = await params;
  const response = await getProduct(id);
  if (!response.success || !response.data) {
    return (
      <DashboardContainer title="Edit product" back={{ href: "/dashboard/products", label: "Back to products" }}>
        <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {response.message || "Product could not be loaded."}
        </p>
      </DashboardContainer>
    );
  }
  return (
    <DashboardContainer
      title="Edit product"
      back={{ href: "/dashboard/products", label: "Back to products" }}
      flush
    >
      <ProductForm product={response.data} />
    </DashboardContainer>
  );
}
