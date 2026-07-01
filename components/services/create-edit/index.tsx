"use client"

import { serviceSchema, type ServiceSchema } from '@/lib/schemas/service-schema'
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, Controller } from "react-hook-form"
import { Field, FieldGroup, FieldContent, FieldLabel, FieldError, FieldSeparator } from "@/components/ui/field"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { CreateService, EditService, type GetService } from '@/actions/services'
import { Checkbox } from '../../ui/checkbox'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

export function ServiceForm({ service }: { service?: Extract<Awaited<ReturnType<typeof GetService>>, { success: true }>['data'] }) {

  const form = useForm<ServiceSchema>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      id: service?.id || "",
      name: service?.name || "",
      description: service?.description || "",
      isActive: service?.isActive || true
    }
  })
  const { formState: { isSubmitting } } = form;

  const router = useRouter();

  const handleSubmit = form.handleSubmit(async (data) => {
    try {
      const res = service?.id
        ? await EditService(data)
        : await CreateService(data);

      if (!res.success) {
        if (Array.isArray(res.error)) {
          res.error.forEach((issue) => {
            form.setError(
              issue.path[0] as keyof ServiceSchema,
              {
                type: "server",
                message: issue.message,
              }
            );
          });
        } else {
          toast.error(
            String(res.error ?? res.message)
          );
        }

        return;
      }

      toast.success(res.message);

      form.reset();
      router.push("/dashboard/services");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Something went wrong"
      );
    }
  });

  return (
    <form onSubmit={handleSubmit} className="p-2 sm:p-5 md:p-8 w-full rounded-md gap-2 border max-w-3xl mx-auto">
        <h1 className="mt-6 mb-1 font-extrabold text-3xl tracking-tight col-span-full">{service?.id ? "Edit Service" : "Create Service"}</h1>
        <FieldSeparator className="my-4 w-full" />
      <FieldGroup className="grid md:grid-cols-6 gap-4 mb-6">

        <Controller
          name="name"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid} className="gap-1 col-span-full">
              <FieldLabel htmlFor="name">Service Name *</FieldLabel>
              <Input
                {...field}
                id="name"
                type="text"
                onChange={(e) => {
                  field.onChange(e.target.value)
                }}
                aria-invalid={fieldState.invalid}
                placeholder="Enter service name"

              />

              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          name="description"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid} className="gap-1 col-span-full">
              <FieldLabel htmlFor="description">Description (optional) </FieldLabel>
              <Textarea
                {...field}
                aria-invalid={fieldState.invalid}
                id="description"
                placeholder="Enter service description"

              />

              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          name="isActive"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field orientation="horizontal" data-invalid={fieldState.invalid} className="col-span-full">
              <FieldContent className="flex flex-row gap-1">
                <Checkbox
                  aria-invalid={fieldState.invalid}
                  id="isActive"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
                <FieldLabel htmlFor="isActive">Active Status </FieldLabel>

                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </FieldContent>
            </Field>
          )}
        />
      </FieldGroup>
      <div className="flex justify-end items-center w-full">
        <Button disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : service?.id ? 'Update' : 'Create'}
        </Button>
      </div>
    </form>
  )
}