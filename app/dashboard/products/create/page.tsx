export const metadata = { title: "Create product" };

import { ProductForm } from "@/components/products/create-edit";
import { requirePageAccess } from "@/lib/auth-guard";
import DashboardContainer from "../../dashboard-container";

export default async function CreateProductPage() {
  await requirePageAccess("/dashboard/products");
  return (
    <DashboardContainer
      title="Add product"
      back={{ href: "/dashboard/products", label: "Back to products" }}
      flush
    >
      <ProductForm />
    </DashboardContainer>
  );
}
