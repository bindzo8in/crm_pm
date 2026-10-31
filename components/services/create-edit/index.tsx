"use client"

import { serviceSchema, type ServiceSchema } from '@/lib/schemas/service-schema'
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, Controller } from "react-hook-form"
import { Field, FieldGroup, FieldContent, FieldLabel, FieldError } from "@/components/ui/field"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { CreateService, EditService, type GetService } from '@/actions/services'
import { Switch } from "@/components/ui/switch"
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowRight, Loader2, PackagePlus, Settings2 } from 'lucide-react'

export function ServiceForm({ service }: { service?: Extract<Awaited<ReturnType<typeof GetService>>, { success: true }>['data'] }) {
  const form = useForm<ServiceSchema>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      id: service?.id || "",
      name: service?.name || "",
      description: service?.description || "",
      isActive: service?.isActive ?? true,
      showInProposal: service?.showInProposal ?? true,
    }
  })
  const { formState: { isSubmitting } } = form
  const router = useRouter()

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

      toast.success(res.message)

      if (service?.id) {
        router.push("/dashboard/services")
      } else if (res.data?.id) {
        router.push(
          `/dashboard/services/packages?serviceId=${encodeURIComponent(res.data.id)}`
        )
      } else {
        toast.error("Service was created, but its package manager could not be opened.")
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Something went wrong"
      )
    }
  })

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto flex w-full min-w-0 max-w-[1180px] flex-col px-4 py-5 sm:px-8 sm:py-8 lg:px-10"
    >
      <header className="mb-6 hidden min-w-0 items-center gap-3 border-b pb-5 sm:mb-8 sm:flex sm:gap-4 sm:pb-6">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary sm:size-11">
          <PackagePlus aria-hidden="true" className="size-[18px] sm:size-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground sm:text-base">
            {service?.id ? "Service details" : "Set up a service"}
          </p>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground sm:text-sm sm:leading-6">
            {service?.id
              ? "Update the service information and where it can be used."
              : "Add a service to your catalog. You can create its packages next."}
          </p>
        </div>
      </header>

      <div className="grid min-w-0 gap-7 lg:grid-cols-[minmax(0,1.5fr)_minmax(17rem,0.8fr)] lg:gap-10">
        <section aria-labelledby="service-information-heading" className="min-w-0">
          <div className="mb-4 sm:mb-5">
            <h2 id="service-information-heading" className="text-base font-semibold">
              Service information
            </h2>
            <p className="mt-1 text-xs leading-5 text-muted-foreground sm:text-sm">
              Give your team a clear name and description.
            </p>
          </div>
          <FieldGroup className="min-w-0 gap-4 sm:gap-5">
            <Controller
              name="name"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid} className="min-w-0 gap-2">
                  <FieldLabel htmlFor="name">
                    Service name <span className="text-destructive" aria-hidden="true">*</span>
                  </FieldLabel>
                  <Input
                    {...field}
                    id="name"
                    type="text"
                    aria-invalid={fieldState.invalid}
                    autoComplete="off"
                    placeholder="e.g. Website development"
                    className="h-11"
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <Controller
              name="description"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid} className="min-w-0 gap-2">
                  <FieldLabel htmlFor="description">
                    Description <span className="font-normal text-muted-foreground">(optional)</span>
                  </FieldLabel>
                  <Textarea
                    {...field}
                    aria-invalid={fieldState.invalid}
                    id="description"
                    placeholder="Describe what this service includes and when it is used."
                    className="min-h-28 resize-y sm:min-h-36"
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </FieldGroup>
        </section>

        <section
          aria-labelledby="service-availability-heading"
          className="min-w-0 border-t pt-5 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0"
        >
          <div className="mb-4 sm:mb-5">
            <div className="flex items-center gap-2">
              <Settings2 aria-hidden="true" className="size-4 text-muted-foreground" />
              <h2 id="service-availability-heading" className="text-base font-semibold">
                Availability
              </h2>
            </div>
            <p className="mt-1.5 text-xs leading-5 text-muted-foreground sm:text-sm">
              Choose where your team can use this service.
            </p>
          </div>
          <div className="divide-y border-y">
            <Controller
              name="isActive"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid} className="min-w-0">
                  <FieldContent className="flex min-w-0 flex-row items-center justify-between gap-4 py-3.5">
                    <div className="min-w-0 space-y-1">
                      <FieldLabel htmlFor="isActive">Active service</FieldLabel>
                      <p className="text-xs leading-5 text-muted-foreground sm:text-sm">
                        Available to use across the CRM.
                      </p>
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </div>
                    <Switch
                      aria-invalid={fieldState.invalid}
                      id="isActive"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FieldContent>
                </Field>
              )}
            />
            <Controller
              name="showInProposal"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid} className="min-w-0">
                  <FieldContent className="flex min-w-0 flex-row items-center justify-between gap-4 py-3.5">
                    <div className="min-w-0 space-y-1">
                      <FieldLabel htmlFor="showInProposal">Show in proposals</FieldLabel>
                      <p className="text-xs leading-5 text-muted-foreground sm:text-sm">
                        Let the team add this service to proposals.
                      </p>
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </div>
                    <Switch
                      aria-invalid={fieldState.invalid}
                      id="showInProposal"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FieldContent>
                </Field>
              )}
            />
          </div>
        </section>
      </div>

      <footer className="mt-6 flex flex-col-reverse gap-3 border-t pt-4 sm:mt-8 sm:flex-row sm:items-center sm:justify-between sm:pt-5">
        <p className="text-xs leading-5 text-muted-foreground">
          <span className="text-destructive">*</span> Required field
        </p>
        <Button type="submit" disabled={isSubmitting} className="min-h-11 w-full gap-2 sm:w-auto sm:min-w-40">
          {isSubmitting ? (
            <>
              <Loader2 aria-hidden="true" className="size-4 animate-spin" />
              {service?.id ? "Saving service..." : "Creating service..."}
            </>
          ) : (
            <>
              {service?.id ? "Save changes" : "Create service"}
              {!service?.id && <ArrowRight aria-hidden="true" className="size-4" />}
            </>
          )}
        </Button>
      </footer>
    </form>
  )
}