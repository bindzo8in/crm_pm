"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import type { z } from "zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, LoaderCircle, PackagePlus } from "lucide-react";
import { createProduct, updateProduct, type getProduct } from "@/actions/products";
import { productSchema, type ProductSchema } from "@/lib/schemas/product-schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Field, FieldContent, FieldGroup, FieldLabel, FieldError } from "@/components/ui/field";
import { UnitSelect } from "@/components/catalog/measurement-units";

type ProductRecord = Extract<Awaited<ReturnType<typeof getProduct>>, { success: true }>["data"];
type ProductFormInput = z.input<typeof productSchema>;

export function ProductForm({ product }: { product?: ProductRecord }) {
  const router = useRouter();
  const form = useForm<ProductFormInput, unknown, ProductSchema>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      id: product?.id,
      sku: product?.sku ?? "",
      name: product?.name ?? "",
      description: product?.description ?? "",
      unit: product?.unit ?? "item",
      basePrice: product?.basePrice ?? 0,
      basePriceUSD: product?.basePriceUSD ?? 0,
      taxRate: product?.taxRate ?? 18,
      hsnCode: product?.hsnCode ?? "",
      isActive: product?.isActive ?? true,
    },
  });

  const submit = form.handleSubmit(async (data) => {
    try {
      const response = product?.id
        ? await updateProduct(data)
        : await createProduct(data);
      if (!response.success) {
        toast.error(response.message || "Product could not be saved");
        return;
      }

      toast.success(response.message);
      router.push("/dashboard/products");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Product could not be saved");
    }
  });

  return (
    <form
      onSubmit={submit}
      className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-5 sm:px-8 sm:py-8"
    >
      <header className="flex items-start gap-3 border-b pb-5">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <PackagePlus aria-hidden="true" className="size-5" />
        </div>
        <div>
          <h2 className="font-semibold">{product ? "Product details" : "Add a product"}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Catalog prices provide defaults; proposal and invoice prices can be adjusted independently.
          </p>
        </div>
      </header>

      <FieldGroup className="gap-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <Controller
            name="name"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="product-name">Product name</FieldLabel>
                <Input {...field} id="product-name" aria-invalid={fieldState.invalid} placeholder="e.g. Printed brochure" />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <Controller
            name="sku"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="product-sku">SKU <span className="font-normal text-muted-foreground">(optional)</span></FieldLabel>
                <Input {...field} value={field.value ?? ""} id="product-sku" aria-invalid={fieldState.invalid} autoComplete="off" />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        </div>

        <Controller
          name="description"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="product-description">Description <span className="font-normal text-muted-foreground">(optional)</span></FieldLabel>
              <Textarea {...field} value={field.value ?? ""} id="product-description" aria-invalid={fieldState.invalid} rows={3} />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <div className="grid gap-5 sm:grid-cols-2">
          <Controller
            name="unit"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="product-unit">Unit</FieldLabel>
                <UnitSelect
                  id="product-unit"
                  value={field.value ?? "item"}
                  onValueChange={field.onChange}
                  invalid={fieldState.invalid}
                  showManage
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <Controller
            name="hsnCode"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="product-hsn">HSN code <span className="font-normal text-muted-foreground">(optional)</span></FieldLabel>
                <Input {...field} value={field.value ?? ""} id="product-hsn" aria-invalid={fieldState.invalid} />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          {([
            ["basePrice", "Base price (INR)"],
            ["basePriceUSD", "Base price (USD)"],
            ["taxRate", "Tax rate (%)"],
          ] as const).map(([name, label]) => (
            <Controller
              key={name}
              name={name}
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={`product-${name}`}>{label}</FieldLabel>
                  <Input
                    {...field}
                    id={`product-${name}`}
                    type="number"
                    min="0"
                    step={name === "taxRate" ? "1" : "0.01"}
                    value={typeof field.value === "string" || typeof field.value === "number" ? field.value : ""}
                    aria-invalid={fieldState.invalid}
                    onChange={(event) => field.onChange(event.target.value === "" ? "" : Number(event.target.value))}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          ))}
        </div>

        <Controller
          name="isActive"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldContent className="flex flex-row items-center justify-between gap-4 rounded-lg border p-4">
                <div className="space-y-1">
                  <FieldLabel htmlFor="product-active">Active product</FieldLabel>
                  <p className="text-sm text-muted-foreground">Active products are available in proposal and invoice catalog searches.</p>
                </div>
                <Switch id="product-active" checked={field.value ?? true} onCheckedChange={field.onChange} aria-invalid={fieldState.invalid} />
              </FieldContent>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </FieldGroup>

      <footer className="flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:justify-between">
        <Button type="button" variant="outline" onClick={() => router.push("/dashboard/products")}>
          <ArrowLeft data-icon="inline-start" />
          Cancel
        </Button>
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting && <LoaderCircle data-icon="inline-start" className="animate-spin" />}
          {product ? "Save changes" : "Create product"}
        </Button>
      </footer>
    </form>
  );
}
